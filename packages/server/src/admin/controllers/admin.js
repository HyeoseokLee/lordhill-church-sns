import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { userStatus, auditAction } from '../../define.js';

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

  res.json(users);
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
    ],
    paranoid: false,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  // 좋아요 수, 댓글 수 집계 + 댓글 목록
  const postIds = rows.map((p) => p.id);
  const [likeCounts, commentCounts, comments] = await Promise.all([
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
  ]);

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

  const items = rows.map((post) => ({
    ...post.toJSON(),
    likeCount: likeMap[post.id] || 0,
    commentCount: commentCountMap[post.id] || 0,
    comments: commentMap[post.id] || [],
  }));

  res.json({
    items,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / pageSize),
  });
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
