import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { userStatus, auditAction } from '../../define.js';
import { deleteFromS3 } from '../../uploader/index.js';
import logger from '../../logger.js';
import { sendPushToAll } from '../../push/pushService.js';

const logAudit = async (adminUserId, action, target, metadata) => {
  await models.AdminAuditLog.create({ adminUserId, action, target, metadata });
};

// 회원 목록 (삭제된 유저 포함)
export const getUsers = async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status === 'deleted') {
    where.deletedAt = { [models.Sequelize.Op.ne]: null };
  } else if (status) {
    where.status = status;
  }

  const users = await models.User.findAll({
    where,
    paranoid: false,
    attributes: [
      'id',
      'email',
      'nickname',
      'profileImageUrl',
      'provider',
      'role',
      'status',
      'createdAt',
      'deletedAt',
    ],
    order: [['createdAt', 'DESC']],
  });

  // 각 유저별 차단당한 내역 조회 (누가 차단했는지 포함)
  const userIds = users.map((u) => u.id);
  const blocks = await models.UserBlock.findAll({
    where: { blockedId: userIds },
    include: [
      {
        model: models.User,
        as: 'blocker',
        attributes: ['id', 'nickname'],
      },
    ],
  });
  const blockMap = {};
  for (const b of blocks) {
    if (!blockMap[b.blockedId]) blockMap[b.blockedId] = [];
    blockMap[b.blockedId].push(b.blocker);
  }

  const result = users.map((u) => ({
    ...u.toJSON(),
    blockedByCount: (blockMap[u.id] || []).length,
    blockedBy: blockMap[u.id] || [],
  }));

  res.json(result);
};

export const approveUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id);
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }

  await user.update({ status: userStatus.approved });
  await logAudit(req.user.id, auditAction.approveUser, `user:${user.id}`, {
    nickname: user.nickname,
  });

  res.json(user);
};

export const rejectUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id);
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }

  await user.update({ status: userStatus.rejected });
  await logAudit(req.user.id, auditAction.rejectUser, `user:${user.id}`, {
    nickname: user.nickname,
  });

  res.json(user);
};

// 회원 계정잠금 (deactivated ↔ approved 토글)
export const deactivateUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id);
  if (!user) throw new ErrClass(ErrInfo.NotFoundUser);

  const newStatus =
    user.status === userStatus.deactivated
      ? userStatus.approved
      : userStatus.deactivated;

  await user.update({ status: newStatus });
  await logAudit(req.user.id, auditAction.deactivateUser, `user:${user.id}`, {
    nickname: user.nickname,
    newStatus,
  });

  res.json(user);
};

// 회원 삭제 (soft delete — paranoid 모델이 자동 처리)
export const deleteUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id);
  if (!user) throw new ErrClass(ErrInfo.NotFoundUser);

  const { id, nickname, email } = user;
  await user.destroy();
  await logAudit(req.user.id, auditAction.deleteUser, `user:${id}`, {
    nickname,
    email,
  });

  res.json({ message: 'ok' });
};

// 삭제된 회원 복구
export const restoreUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id, { paranoid: false });
  if (!user || !user.deletedAt) throw new ErrClass(ErrInfo.NotFoundUser);

  await user.restore();
  await user.update({ status: userStatus.approved });
  await logAudit(req.user.id, auditAction.restoreUser, `user:${user.id}`, {
    nickname: user.nickname,
  });

  res.json(user);
};

export const deletePostByAdmin = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  // 게시글 + 관련 댓글/좋아요 모두 삭제
  await models.Comment.destroy({ where: { postId: post.id } });
  await models.Like.destroy({ where: { postId: post.id } });
  await post.destroy();
  await logAudit(req.user.id, auditAction.deletePost, `post:${post.id}`, {
    userId: post.userId,
  });

  res.json({ message: 'ok' });
};

// 삭제된 게시글 복구 (게시글 + 관련 댓글 모두 복구)
export const restorePost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id, { paranoid: false });
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  await post.restore();
  await models.Comment.restore({ where: { postId: post.id } });
  await logAudit(req.user.id, 'restore_post', `post:${post.id}`, {
    userId: post.userId,
  });

  res.json({ message: 'ok' });
};

export const deleteCommentByAdmin = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }

  await comment.destroy(); // soft delete
  await logAudit(
    req.user.id,
    auditAction.deleteComment,
    `comment:${comment.id}`,
    {
      userId: comment.userId,
      postId: comment.postId,
    },
  );

  res.json({ message: 'ok' });
};

// 삭제된 댓글 복구
export const restoreComment = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }

  await comment.restore();
  await logAudit(req.user.id, 'restore_comment', `comment:${comment.id}`, {
    userId: comment.userId,
    postId: comment.postId,
  });

  res.json({ message: 'ok' });
};

// 게시글 영구삭제 (하드 딜리트 + S3 이미지 삭제)
export const permanentDeletePost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id, { paranoid: false });
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  // S3 이미지 삭제
  const media = await models.PostMedia.findAll({ where: { postId: post.id } });
  if (media.length > 0) {
    const urls = media.map((m) => m.url);
    try {
      await deleteFromS3(urls);
      logger.info('s3-images-deleted', { postId: post.id, count: urls.length });
    } catch (err) {
      logger.error('s3-images-delete-failed', { error: err.message });
    }
  }

  // DB 하드 딜리트 (paranoid 무시)
  await models.Comment.destroy({ where: { postId: post.id }, force: true });
  await models.Like.destroy({ where: { postId: post.id } });
  await models.PostMedia.destroy({ where: { postId: post.id } });
  await post.destroy({ force: true });

  await logAudit(req.user.id, 'permanent_delete_post', `post:${post.id}`, {
    userId: post.userId,
    mediaCount: media.length,
  });

  res.json({ message: 'ok' });
};

// 댓글 영구삭제 (하드 딜리트)
export const permanentDeleteComment = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }

  await comment.destroy({ force: true });
  await logAudit(
    req.user.id,
    'permanent_delete_comment',
    `comment:${comment.id}`,
    { userId: comment.userId, postId: comment.postId },
  );

  res.json({ message: 'ok' });
};

// 어드민 게시글 목록 (좋아요 수 포함, 페이지네이션)
export const getPosts = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * pageSize;

  // 삭제된 게시글도 포함하여 조회
  const { rows, count } = await models.Post.findAndCountAll({
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      {
        model: models.PostMedia,
        as: 'media',
        attributes: ['id', 'url', 'order'],
      },
    ],
    paranoid: false,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  // 좋아요 수, 댓글 수, 신고 수 집계 + 댓글 목록
  const postIds = rows.map((p) => p.id);
  const [likeCounts, commentCounts, comments, reportCounts] = await Promise.all(
    [
      models.Like.findAll({
        attributes: [
          'postId',
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
        ],
        where: { postId: postIds },
        group: ['postId'],
        raw: true,
      }),
      models.Comment.findAll({
        attributes: [
          'postId',
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
        ],
        where: { postId: postIds },
        group: ['postId'],
        paranoid: false,
        raw: true,
      }),
      models.Comment.findAll({
        where: { postId: postIds },
        paranoid: false,
        include: [
          {
            model: models.User,
            as: 'user',
            attributes: ['id', 'nickname'],
          },
        ],
        order: [['createdAt', 'ASC']],
      }),
      // 게시글 + 댓글 신고 상세 내역 (건수 대신 전체 목록)
      models.Report.findAll({
        where: {
          [models.Sequelize.Op.or]: [{ targetType: 'post', targetId: postIds }],
        },
        include: [
          {
            model: models.User,
            as: 'reporter',
            attributes: ['id', 'nickname'],
          },
        ],
        order: [['createdAt', 'DESC']],
      }),
    ],
  );

  const likeMap = Object.fromEntries(
    likeCounts.map((l) => [l.postId, parseInt(l.count, 10)]),
  );
  const commentCountMap = Object.fromEntries(
    commentCounts.map((c) => [c.postId, parseInt(c.count, 10)]),
  );
  const commentMap = {};
  for (const c of comments) {
    if (!commentMap[c.postId]) commentMap[c.postId] = [];
    commentMap[c.postId].push(c);
  }

  // 게시글 신고 목록을 postId별로 그룹핑
  const postReportListMap = {};
  for (const r of reportCounts) {
    if (!postReportListMap[r.targetId]) postReportListMap[r.targetId] = [];
    postReportListMap[r.targetId].push(r);
  }

  // 댓글 신고 상세 내역 조회
  const commentIds = comments.map((c) => c.id);
  const commentReports =
    commentIds.length > 0
      ? await models.Report.findAll({
          where: { targetType: 'comment', targetId: commentIds },
          include: [
            {
              model: models.User,
              as: 'reporter',
              attributes: ['id', 'nickname'],
            },
          ],
          order: [['createdAt', 'DESC']],
        })
      : [];
  const commentReportListMap = {};
  for (const r of commentReports) {
    if (!commentReportListMap[r.targetId])
      commentReportListMap[r.targetId] = [];
    commentReportListMap[r.targetId].push(r);
  }

  const items = rows.map((post) => {
    const postReports = postReportListMap[post.id] || [];
    return {
      ...post.toJSON(),
      likeCount: likeMap[post.id] || 0,
      commentCount: commentCountMap[post.id] || 0,
      reportCount: postReports.filter((r) => r.status === 'pending').length,
      reports: postReports,
      comments: (commentMap[post.id] || []).map((c) => {
        const cReports = commentReportListMap[c.id] || [];
        return {
          ...c.toJSON(),
          reportCount: cReports.filter((r) => r.status === 'pending').length,
          reports: cReports,
        };
      }),
    };
  });

  res.json({
    items,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / pageSize),
  });
};

// 어드민 공유글 목록 (페이지네이션, 삭제 포함)
export const getRecycles = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * pageSize;

  const { rows, count } = await models.Recycle.findAndCountAll({
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      {
        model: models.RecycleMedia,
        as: 'media',
        attributes: ['id', 'url', 'order'],
      },
      {
        model: models.User,
        as: 'toUser',
        attributes: ['id', 'nickname'],
      },
    ],
    paranoid: false,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  const ids = rows.map((r) => r.id);
  const [commentCounts, comments, reportCounts] = await Promise.all([
    models.RecycleComment.findAll({
      attributes: [
        'recycleId',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
      ],
      where: { recycleId: ids },
      paranoid: false,
      group: ['recycleId'],
      raw: true,
    }),
    models.RecycleComment.findAll({
      where: { recycleId: ids },
      paranoid: false,
      include: [
        { model: models.User, as: 'user', attributes: ['id', 'nickname'] },
      ],
      order: [['createdAt', 'ASC']],
    }),
    // 재활용 게시글 신고 상세 내역
    models.Report.findAll({
      where: { targetType: 'recycle', targetId: ids },
      include: [
        {
          model: models.User,
          as: 'reporter',
          attributes: ['id', 'nickname'],
        },
      ],
      order: [['createdAt', 'DESC']],
    }),
  ]);

  const commentMap = Object.fromEntries(
    commentCounts.map((c) => [c.recycleId, parseInt(c.count, 10)]),
  );
  const commentListMap = {};
  for (const c of comments) {
    if (!commentListMap[c.recycleId]) commentListMap[c.recycleId] = [];
    commentListMap[c.recycleId].push(c);
  }

  // 재활용 게시글 신고 목록 그룹핑
  const recycleReportListMap = {};
  for (const r of reportCounts) {
    if (!recycleReportListMap[r.targetId])
      recycleReportListMap[r.targetId] = [];
    recycleReportListMap[r.targetId].push(r);
  }

  // 재활용 댓글 신고 상세 내역
  const recycleCommentIds = comments.map((c) => c.id);
  const recycleCommentReports =
    recycleCommentIds.length > 0
      ? await models.Report.findAll({
          where: {
            targetType: 'recycle_comment',
            targetId: recycleCommentIds,
          },
          include: [
            {
              model: models.User,
              as: 'reporter',
              attributes: ['id', 'nickname'],
            },
          ],
          order: [['createdAt', 'DESC']],
        })
      : [];
  const recycleCommentReportListMap = {};
  for (const r of recycleCommentReports) {
    if (!recycleCommentReportListMap[r.targetId])
      recycleCommentReportListMap[r.targetId] = [];
    recycleCommentReportListMap[r.targetId].push(r);
  }

  const items = rows.map((item) => {
    const itemReports = recycleReportListMap[item.id] || [];
    return {
      ...item.toJSON(),
      commentCount: commentMap[item.id] || 0,
      reportCount: itemReports.filter((r) => r.status === 'pending').length,
      reports: itemReports,
      comments: (commentListMap[item.id] || []).map((c) => {
        const cReports = recycleCommentReportListMap[c.id] || [];
        return {
          ...c.toJSON(),
          reportCount: cReports.filter((r) => r.status === 'pending').length,
          reports: cReports,
        };
      }),
    };
  });

  res.json({
    items,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / pageSize),
  });
};

// 공유글 삭제 (소프트 딜리트)
export const deleteRecycleByAdmin = async (req, res) => {
  const item = await models.Recycle.findByPk(req.params.id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  await models.RecycleComment.destroy({ where: { recycleId: item.id } });
  await item.destroy();
  await logAudit(req.user.id, 'delete_recycle', `recycle:${item.id}`, {
    userId: item.userId,
  });
  res.json({ message: 'ok' });
};

// 공유글 복구
export const restoreRecycle = async (req, res) => {
  const item = await models.Recycle.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  await item.restore();
  await models.RecycleComment.restore({ where: { recycleId: item.id } });
  await logAudit(req.user.id, 'restore_recycle', `recycle:${item.id}`, {
    userId: item.userId,
  });
  res.json({ message: 'ok' });
};

// 공유글 영구삭제 (하드 딜리트 + S3)
export const permanentDeleteRecycle = async (req, res) => {
  const item = await models.Recycle.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  const media = await models.RecycleMedia.findAll({
    where: { recycleId: item.id },
  });
  if (media.length > 0) {
    try {
      await deleteFromS3(media.map((m) => m.url));
    } catch (err) {
      logger.error('s3-recycle-images-delete-failed', {
        error: err.message,
      });
    }
  }
  await models.RecycleComment.destroy({
    where: { recycleId: item.id },
    force: true,
  });
  await models.RecycleMedia.destroy({ where: { recycleId: item.id } });
  await item.destroy({ force: true });
  await logAudit(
    req.user.id,
    'permanent_delete_recycle',
    `recycle:${item.id}`,
    { userId: item.userId },
  );
  res.json({ message: 'ok' });
};

// 공유글 댓글 삭제 (소프트)
export const deleteRecycleComment = async (req, res) => {
  const comment = await models.RecycleComment.findByPk(req.params.id);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  await comment.destroy();
  await logAudit(
    req.user.id,
    'delete_recycle_comment',
    `recycle_comment:${comment.id}`,
    { recycleId: comment.recycleId },
  );
  res.json({ message: 'ok' });
};

// 공유글 댓글 복구
export const restoreRecycleComment = async (req, res) => {
  const comment = await models.RecycleComment.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  await comment.restore();
  await logAudit(
    req.user.id,
    'restore_recycle_comment',
    `recycle_comment:${comment.id}`,
    { recycleId: comment.recycleId },
  );
  res.json({ message: 'ok' });
};

// 공유글 댓글 영구삭제
export const permanentDeleteRecycleComment = async (req, res) => {
  const comment = await models.RecycleComment.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  await comment.destroy({ force: true });
  await logAudit(
    req.user.id,
    'permanent_delete_recycle_comment',
    `recycle_comment:${comment.id}`,
    { recycleId: comment.recycleId },
  );
  res.json({ message: 'ok' });
};

export const getDashboard = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, pendingUsers, todayPosts] = await Promise.all([
    models.User.count(),
    models.User.count({ where: { status: userStatus.pending } }),
    models.Post.count({
      where: { createdAt: { [models.Sequelize.Op.gte]: today } },
    }),
  ]);

  res.json({ totalUsers, pendingUsers, todayPosts });
};

// 신고 기각 처리
export const dismissReport = async (req, res) => {
  const report = await models.Report.findByPk(req.params.id);
  if (!report) {
    throw new ErrClass(ErrInfo.NotFound, '해당 신고를 찾을 수 없습니다.');
  }
  await report.update({ status: 'dismissed' });

  await logAudit(req.user.id, 'dismiss_report', `report:${report.id}`, {
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
  });

  res.json({ message: '신고가 기각되었습니다.' });
};

// 어드민 공지사항 목록 (삭제 포함)
export const getAdminNotices = async (_req, res) => {
  const notices = await models.Notice.findAll({
    paranoid: false,
    order: [
      ['displayOrder', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });
  res.json(notices);
};

// 공지사항 생성
export const createNotice = async (req, res) => {
  const { title, content, displayOrder = 0 } = req.body;
  if (!title || !content) {
    throw new ErrClass(ErrInfo.BadRequest, '제목과 내용을 입력해주세요.');
  }
  const notice = await models.Notice.create({
    title,
    content,
    displayOrder,
  });
  await logAudit(req.user.id, 'create_notice', `notice:${notice.id}`, {
    title,
  });

  // 전체 유저에게 푸시 알림 발송
  sendPushToAll({
    title: '새 공지사항',
    body: title,
    data: { path: '/my/notices' },
    senderType: 'system',
  }).catch((err) => logger.error('notice-push-failed', { error: err.message }));

  res.json(notice);
};

// 공지사항 순서 일괄 업데이트
export const reorderNotices = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ErrClass(ErrInfo.BadRequest, '순서 데이터가 필요합니다.');
  }
  await Promise.all(
    ids.map((id, index) =>
      models.Notice.update({ displayOrder: index }, { where: { id } }),
    ),
  );
  res.json({ message: '순서가 변경되었습니다.' });
};

// 공지사항 수정
export const updateNotice = async (req, res) => {
  const notice = await models.Notice.findByPk(req.params.id);
  if (!notice) {
    throw new ErrClass(ErrInfo.NotFound, '공지사항을 찾을 수 없습니다.');
  }
  const { title, content, displayOrder } = req.body;
  await notice.update({
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(displayOrder !== undefined && { displayOrder }),
  });
  await logAudit(req.user.id, 'update_notice', `notice:${notice.id}`, {
    title: notice.title,
  });
  res.json(notice);
};

// 공지사항 삭제 (소프트 딜리트)
export const deleteNotice = async (req, res) => {
  const notice = await models.Notice.findByPk(req.params.id);
  if (!notice) {
    throw new ErrClass(ErrInfo.NotFound, '공지사항을 찾을 수 없습니다.');
  }
  await notice.destroy();
  await logAudit(req.user.id, 'delete_notice', `notice:${notice.id}`, {
    title: notice.title,
  });
  res.json({ message: '삭제되었습니다.' });
};

// 공지사항 복구
export const restoreNotice = async (req, res) => {
  const notice = await models.Notice.findByPk(req.params.id, {
    paranoid: false,
  });
  if (!notice) {
    throw new ErrClass(ErrInfo.NotFound, '공지사항을 찾을 수 없습니다.');
  }
  await notice.restore();
  await logAudit(req.user.id, 'restore_notice', `notice:${notice.id}`, {
    title: notice.title,
  });
  res.json(notice);
};
