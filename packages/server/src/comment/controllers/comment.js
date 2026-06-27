import { Op } from 'sequelize';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { pagination, contentLimit } from '../../define.js';
import { sendPushToUser } from '../../push/pushService.js';
import logger from '../../logger.js';

export const getComments = async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { page = 1, limit = pagination.commentPageSize } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * pageSize;

  const post = await models.Post.findByPk(postId);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  // 차단한 유저의 댓글 제외
  const blocks = await models.UserBlock.findAll({
    where: { blockerId: req.user.id },
    attributes: ['blockedId'],
    raw: true,
  });
  const blockedIds = blocks.map((b) => b.blockedId);

  const commentWhere = { postId };
  if (blockedIds.length > 0) {
    commentWhere.userId = { [Op.notIn]: blockedIds };
  }

  const { rows, count } = await models.Comment.findAndCountAll({
    where: commentWhere,
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl', 'status'],
      },
    ],
    order: [['createdAt', 'ASC']],
    limit: pageSize,
    offset,
  });

  res.json({
    items: rows,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / pageSize),
  });
};

export const createComment = async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    throw new ErrClass(ErrInfo.BadRequest, '댓글 내용을 입력해주세요.');
  }
  if (content.length > contentLimit.commentMaxLength) {
    throw new ErrClass(ErrInfo.CommentContentTooLong);
  }

  const post = await models.Post.findByPk(postId);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  const comment = await models.Comment.create({
    postId,
    userId: req.user.id,
    content: content.trim(),
  });

  const result = await models.Comment.findByPk(comment.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
  });

  // 본인 글에 본인이 댓글 단 게 아닐 때만 푸시 판별
  if (post.userId !== req.user.id) {
    const commentCount = await models.Comment.count({ where: { postId } });

    // 최초 1건 또는 5의 배수일 때 푸시 전송
    if (commentCount === 1 || commentCount % 5 === 0) {
      const commenter = await models.User.findByPk(req.user.id, {
        attributes: ['nickname'],
      });
      const title = '손안의 교회';
      const body =
        commentCount === 1
          ? `${commenter.nickname}님이 댓글을 남겼습니다.`
          : `${commentCount}명이 댓글을 달았습니다.`;

      sendPushToUser(post.userId, {
        title,
        body,
        data: { path: `/feed/detail/${postId}` },
      }).catch((err) =>
        logger.error('comment-push-failed', { error: err.message }),
      );
    }
  }

  res.status(201).json(result);
};

// 댓글 수정
export const updateComment = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  if (comment.userId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    throw new ErrClass(ErrInfo.BadRequest, '댓글 내용을 입력해주세요.');
  }
  if (content.length > contentLimit.commentMaxLength) {
    throw new ErrClass(ErrInfo.CommentContentTooLong);
  }

  await comment.update({ content: content.trim() });

  const result = await models.Comment.findByPk(comment.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
  });
  res.json(result);
};

export const deleteComment = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  if (comment.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  await comment.destroy(); // soft delete (paranoid)
  res.json({ message: 'ok' });
};
