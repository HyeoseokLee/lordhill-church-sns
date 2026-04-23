import { Op } from 'sequelize';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { pagination, contentLimit } from '../../define.js';

export const getFeed = async (req, res) => {
  const { cursor, limit = pagination.feedPageSize } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);

  const where = {};
  if (cursor) {
    where.createdAt = { [Op.lt]: new Date(cursor) };
  }

  const posts = await models.Post.findAll({
    where,
    include: [
      {
        model: models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'profileImageUrl', 'status'],
      },
      {
        model: models.PostMedia,
        as: 'media',
        attributes: ['id', 'mediaType', 'url', 'order'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize + 1,
  });

  const hasMore = posts.length > pageSize;
  const items = hasMore ? posts.slice(0, pageSize) : posts;
  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null;

  // 좋아요 수, 댓글 수 집계
  const postIds = items.map((p) => p.id);
  const [likeCounts, commentCounts, userLikes] = await Promise.all([
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
      raw: true,
    }),
    models.Like.findAll({
      where: { postId: postIds, userId: req.user.id },
      attributes: ['postId'],
      raw: true,
    }),
  ]);

  const likeMap = Object.fromEntries(
    likeCounts.map((l) => [l.postId, parseInt(l.count, 10)]),
  );
  const commentMap = Object.fromEntries(
    commentCounts.map((c) => [c.postId, parseInt(c.count, 10)]),
  );
  const userLikeSet = new Set(userLikes.map((l) => l.postId));

  const result = items.map((post) => ({
    ...post.toJSON(),
    likeCount: likeMap[post.id] || 0,
    commentCount: commentMap[post.id] || 0,
    isLiked: userLikeSet.has(post.id),
  }));

  res.json({ items: result, nextCursor, hasMore });
};

export const getPost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id, {
    include: [
      {
        model: models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'profileImageUrl', 'status'],
      },
      {
        model: models.PostMedia,
        as: 'media',
        attributes: ['id', 'mediaType', 'url', 'order'],
      },
    ],
  });

  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  const [likeCount, commentCount, isLiked] = await Promise.all([
    models.Like.count({ where: { postId: post.id } }),
    models.Comment.count({ where: { postId: post.id } }),
    models.Like.findOne({ where: { postId: post.id, userId: req.user.id } }),
  ]);

  res.json({
    ...post.toJSON(),
    likeCount,
    commentCount,
    isLiked: !!isLiked,
  });
};

export const createPost = async (req, res) => {
  const { content } = req.body;

  if (content && content.length > contentLimit.postMaxLength) {
    throw new ErrClass(ErrInfo.PostContentTooLong);
  }

  const post = await models.Post.create({
    authorId: req.user.id,
    content: content || null,
  });

  // 이미지 파일 처리
  if (req.files && req.files.length > 0) {
    const mediaRecords = req.files.map((file, index) => ({
      postId: post.id,
      mediaType: 'image',
      url: file.location || file.path,
      order: index,
    }));
    await models.PostMedia.bulkCreate(mediaRecords);
  }

  const result = await models.Post.findByPk(post.id, {
    include: [
      {
        model: models.User,
        as: 'author',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      { model: models.PostMedia, as: 'media' },
    ],
  });

  res.status(201).json(result);
};

export const updatePost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }
  if (post.authorId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  const { content } = req.body;
  if (content && content.length > contentLimit.postMaxLength) {
    throw new ErrClass(ErrInfo.PostContentTooLong);
  }

  await post.update({ content });
  res.json(post);
};

export const deletePost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  await post.destroy(); // soft delete (paranoid)
  res.json({ message: 'ok' });
};

export const toggleLike = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  const post = await models.Post.findByPk(postId);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  const existing = await models.Like.findOne({ where: { userId, postId } });
  if (existing) {
    await existing.destroy();
    const count = await models.Like.count({ where: { postId } });
    return res.json({ isLiked: false, likeCount: count });
  }

  await models.Like.create({ userId, postId });
  const count = await models.Like.count({ where: { postId } });
  res.json({ isLiked: true, likeCount: count });
};
