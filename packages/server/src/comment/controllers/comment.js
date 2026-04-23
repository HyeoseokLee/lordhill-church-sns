import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { pagination, contentLimit } from '../../define.js';

export const getComments = async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { page = 1, limit = pagination.commentPageSize } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * pageSize;

  const post = await models.Post.findByPk(postId);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  const { rows, count } = await models.Comment.findAndCountAll({
    where: { postId },
    include: [
      {
        model: models.User,
        as: 'author',
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
    authorId: req.user.id,
    content: content.trim(),
  });

  const result = await models.Comment.findByPk(comment.id, {
    include: [
      {
        model: models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
  });

  res.status(201).json(result);
};

export const deleteComment = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  if (comment.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  await comment.destroy(); // soft delete (paranoid)
  res.json({ message: 'ok' });
};
