import { Op } from 'sequelize';
import config from 'config';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { pagination, contentLimit } from '../../define.js';
import { generatePresignedUrl, deleteFromS3 } from '../../uploader/index.js';
import { containsBadWord } from '../../filter/contentFilter.js';

// 게시글의 좋아요 누른 유저 목록 조회
const getLikedUsers = async (postId) => {
  const likes = await models.Like.findAll({
    where: { postId },
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  return likes.map((l) => l.user);
};

// 여러 게시글의 좋아요 유저 목록을 한 번에 조회
const getLikedUsersMap = async (postIds) => {
  const likes = await models.Like.findAll({
    where: { postId: postIds },
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  const map = {};
  for (const like of likes) {
    if (!map[like.postId]) map[like.postId] = [];
    map[like.postId].push(like.user);
  }
  return map;
};

export const getFeed = async (req, res) => {
  const { cursor, limit = pagination.feedPageSize } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);

  // 차단한 유저의 게시글 제외
  const blocks = await models.UserBlock.findAll({
    where: { blockerId: req.user.id },
    attributes: ['blockedId'],
    raw: true,
  });
  const blockedIds = blocks.map((b) => b.blockedId);

  const where = {};
  if (blockedIds.length > 0) {
    where.userId = { [Op.notIn]: blockedIds };
  }
  if (cursor) {
    where.createdAt = { [Op.lt]: new Date(cursor) };
  }

  const posts = await models.Post.findAll({
    where,
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl', 'status'],
      },
      {
        model: models.PostMedia,
        as: 'media',
        attributes: ['id', 'mediaType', 'url', 'order'],
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      [{ model: models.PostMedia, as: 'media' }, 'order', 'ASC'],
    ],
    limit: pageSize + 1,
  });

  const hasMore = posts.length > pageSize;
  const items = hasMore ? posts.slice(0, pageSize) : posts;
  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null;

  // 좋아요 수, 댓글 수 집계
  const postIds = items.map((p) => p.id);
  const [commentCounts, userLikes, likedUsersMap] = await Promise.all([
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
    getLikedUsersMap(postIds),
  ]);

  const commentMap = Object.fromEntries(
    commentCounts.map((c) => [c.postId, parseInt(c.count, 10)]),
  );
  const userLikeSet = new Set(userLikes.map((l) => l.postId));

  const result = items.map((post) => {
    const likedUsers = likedUsersMap[post.id] || [];
    return {
      ...post.toJSON(),
      likeCount: likedUsers.length,
      likedUsers,
      commentCount: commentMap[post.id] || 0,
      isLiked: userLikeSet.has(post.id),
    };
  });

  res.json({ items: result, nextCursor, hasMore });
};

export const getPost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl', 'status'],
      },
      {
        model: models.PostMedia,
        as: 'media',
        attributes: ['id', 'mediaType', 'url', 'order'],
      },
    ],
    order: [[{ model: models.PostMedia, as: 'media' }, 'order', 'ASC']],
  });

  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  const [commentCount, isLiked, likedUsers] = await Promise.all([
    models.Comment.count({ where: { postId: post.id } }),
    models.Like.findOne({ where: { postId: post.id, userId: req.user.id } }),
    getLikedUsers(post.id),
  ]);

  res.json({
    ...post.toJSON(),
    likeCount: likedUsers.length,
    likedUsers,
    commentCount,
    isLiked: !!isLiked,
  });
};

// 이미지 Presigned URL 발급
export const presignImages = async (req, res) => {
  const { files } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new ErrClass(ErrInfo.BadRequest, '파일 정보가 필요합니다.');
  }
  if (files.length > contentLimit.imageMaxCount) {
    throw new ErrClass(ErrInfo.LimitFileCount);
  }

  const results = await Promise.all(
    files.map(({ filename, contentType }) =>
      generatePresignedUrl(filename, contentType),
    ),
  );

  res.json(results);
};

// 게시글 작성 (content + mediaKeys)
export const createPost = async (req, res) => {
  const { content, mediaKeys } = req.body;

  if (content && content.length > contentLimit.postMaxLength) {
    throw new ErrClass(ErrInfo.PostContentTooLong);
  }
  if (containsBadWord(content)) {
    throw new ErrClass(
      ErrInfo.BadRequest,
      '부적절한 표현이 포함되어 있습니다.',
    );
  }

  const post = await models.Post.create({
    userId: req.user.id,
    content: content || null,
  });

  // S3 key를 post_media에 저장
  if (mediaKeys && mediaKeys.length > 0) {
    const s3Config = config.uploader.s3;
    const baseUrl = s3Config.endpoint
      ? `${s3Config.endpoint}/${s3Config.bucketName}`
      : `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com`;

    const mediaRecords = mediaKeys.map((key, index) => ({
      postId: post.id,
      mediaType: 'image',
      url: `${baseUrl}/${key}`,
      order: index,
    }));
    await models.PostMedia.bulkCreate(mediaRecords);
  }

  const result = await models.Post.findByPk(post.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      { model: models.PostMedia, as: 'media' },
    ],
  });

  res.status(201).json(result);
};

// 게시글 수정 (content + 새 이미지 추가)
export const updatePost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }
  if (post.userId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  const { content, newMediaKeys } = req.body;
  if (content && content.length > contentLimit.postMaxLength) {
    throw new ErrClass(ErrInfo.PostContentTooLong);
  }

  await post.update({ content });

  // 새 이미지 추가
  if (newMediaKeys && newMediaKeys.length > 0) {
    const s3Config = config.uploader.s3;
    const baseUrl = s3Config.endpoint
      ? `${s3Config.endpoint}/${s3Config.bucketName}`
      : `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com`;

    // 기존 이미지 개수로 order 이어서 부여
    const existingCount = await models.PostMedia.count({
      where: { postId: post.id },
    });

    const mediaRecords = newMediaKeys.map((key, index) => ({
      postId: post.id,
      mediaType: 'image',
      url: `${baseUrl}/${key}`,
      order: existingCount + index,
    }));
    await models.PostMedia.bulkCreate(mediaRecords);
  }

  const result = await models.Post.findByPk(post.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      { model: models.PostMedia, as: 'media' },
    ],
  });
  res.json(result);
};

// 개별 이미지 삭제 (post_media + S3)
export const deleteMedia = async (req, res) => {
  const media = await models.PostMedia.findByPk(req.params.mediaId);
  if (!media) {
    throw new ErrClass(ErrInfo.NotFound);
  }

  // 게시글 작성자 확인
  const post = await models.Post.findByPk(media.postId);
  if (!post || post.userId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  // S3 삭제
  try {
    await deleteFromS3([media.url]);
  } catch {
    // S3 삭제 실패해도 DB는 삭제 진행
  }

  await media.destroy();
  res.json({ message: 'ok' });
};

export const deletePost = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }
  if (post.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  // 게시글 + 관련 댓글/좋아요 모두 삭제
  await models.Comment.destroy({ where: { postId: post.id } });
  await models.Like.destroy({ where: { postId: post.id } });
  await post.destroy();
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
  } else {
    await models.Like.create({ userId, postId });
  }

  const likedUsers = await getLikedUsers(postId);
  res.json({
    isLiked: !existing,
    likeCount: likedUsers.length,
    likedUsers,
  });
};
