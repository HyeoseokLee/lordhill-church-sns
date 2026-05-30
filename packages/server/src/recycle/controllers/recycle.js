import { Op } from 'sequelize';
import config from 'config';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { pagination, contentLimit } from '../../define.js';
import { generatePresignedUrl, deleteFromS3 } from '../../uploader/index.js';

// 목록 (커서 페이지네이션)
export const getRecycles = async (req, res) => {
  const { cursor, limit = pagination.feedPageSize } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);

  const where = {};
  if (cursor) {
    where.createdAt = { [Op.lt]: new Date(cursor) };
  }

  const items = await models.Recycle.findAll({
    where,
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      {
        model: models.RecycleMedia,
        as: 'media',
        attributes: ['id', 'mediaType', 'url', 'order'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize + 1,
  });

  const hasMore = items.length > pageSize;
  const result = hasMore ? items.slice(0, pageSize) : items;
  const nextCursor = hasMore
    ? result[result.length - 1].createdAt.toISOString()
    : null;

  // 댓글 수 집계
  const ids = result.map((r) => r.id);
  const commentCounts = await models.RecycleComment.findAll({
    attributes: [
      'recycleId',
      [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
    ],
    where: { recycleId: ids },
    group: ['recycleId'],
    raw: true,
  });
  const commentMap = Object.fromEntries(
    commentCounts.map((c) => [c.recycleId, parseInt(c.count, 10)]),
  );

  const data = result.map((item) => ({
    ...item.toJSON(),
    commentCount: commentMap[item.id] || 0,
  }));

  res.json({ items: data, nextCursor, hasMore });
};

// 상세
export const getRecycle = async (req, res) => {
  const item = await models.Recycle.findByPk(req.params.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      {
        model: models.RecycleMedia,
        as: 'media',
        attributes: ['id', 'mediaType', 'url', 'order'],
      },
    ],
  });

  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }

  const commentCount = await models.RecycleComment.count({
    where: { recycleId: item.id },
  });

  res.json({ ...item.toJSON(), commentCount });
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

// 생성
export const createRecycle = async (req, res) => {
  const { title, content, mediaKeys } = req.body;

  if (!title || !title.trim()) {
    throw new ErrClass(ErrInfo.BadRequest, '제목을 입력해주세요.');
  }

  const item = await models.Recycle.create({
    userId: req.user.id,
    title: title.trim(),
    content: content || null,
  });

  // S3 key를 recycle_media에 저장
  if (mediaKeys && mediaKeys.length > 0) {
    const s3Config = config.uploader.s3;
    const baseUrl = s3Config.endpoint
      ? `${s3Config.endpoint}/${s3Config.bucketName}`
      : `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com`;

    const mediaRecords = mediaKeys.map((key, index) => ({
      recycleId: item.id,
      mediaType: 'image',
      url: `${baseUrl}/${key}`,
      order: index,
    }));
    await models.RecycleMedia.bulkCreate(mediaRecords);
  }

  const result = await models.Recycle.findByPk(item.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      { model: models.RecycleMedia, as: 'media' },
    ],
  });

  res.status(201).json(result);
};

// 수정
export const updateRecycle = async (req, res) => {
  const item = await models.Recycle.findByPk(req.params.id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  if (item.userId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  const { title, content, newMediaKeys } = req.body;
  await item.update({
    title: title?.trim() || item.title,
    content: content ?? item.content,
  });

  // 새 이미지 추가
  if (newMediaKeys && newMediaKeys.length > 0) {
    const s3Config = config.uploader.s3;
    const baseUrl = s3Config.endpoint
      ? `${s3Config.endpoint}/${s3Config.bucketName}`
      : `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com`;

    const existingCount = await models.RecycleMedia.count({
      where: { recycleId: item.id },
    });

    const mediaRecords = newMediaKeys.map((key, index) => ({
      recycleId: item.id,
      mediaType: 'image',
      url: `${baseUrl}/${key}`,
      order: existingCount + index,
    }));
    await models.RecycleMedia.bulkCreate(mediaRecords);
  }

  const result = await models.Recycle.findByPk(item.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
      { model: models.RecycleMedia, as: 'media' },
    ],
  });
  res.json(result);
};

// 삭제 (소프트 딜리트 + 댓글)
export const deleteRecycle = async (req, res) => {
  const item = await models.Recycle.findByPk(req.params.id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  if (item.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  await models.RecycleComment.destroy({ where: { recycleId: item.id } });
  await item.destroy();
  res.json({ message: 'ok' });
};

// 개별 이미지 삭제 (DB + S3)
export const deleteMedia = async (req, res) => {
  const media = await models.RecycleMedia.findByPk(req.params.mediaId);
  if (!media) {
    throw new ErrClass(ErrInfo.NotFound);
  }

  const item = await models.Recycle.findByPk(media.recycleId);
  if (!item || item.userId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  try {
    await deleteFromS3([media.url]);
  } catch {
    // S3 삭제 실패해도 DB는 삭제 진행
  }

  await media.destroy();
  res.json({ message: 'ok' });
};

// 댓글 목록
export const getComments = async (req, res) => {
  const recycleId = parseInt(req.params.id, 10);
  const { page = 1, limit = pagination.commentPageSize } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * pageSize;

  const { rows, count } = await models.RecycleComment.findAndCountAll({
    where: { recycleId },
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
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

// 댓글 작성
export const createComment = async (req, res) => {
  const recycleId = parseInt(req.params.id, 10);
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ErrClass(ErrInfo.BadRequest, '댓글 내용을 입력해주세요.');
  }
  if (content.length > contentLimit.commentMaxLength) {
    throw new ErrClass(ErrInfo.CommentContentTooLong);
  }

  const item = await models.Recycle.findByPk(recycleId);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }

  const comment = await models.RecycleComment.create({
    recycleId,
    userId: req.user.id,
    content: content.trim(),
  });

  const result = await models.RecycleComment.findByPk(comment.id, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
  });

  res.status(201).json(result);
};

// 댓글 수정
export const updateComment = async (req, res) => {
  const comment = await models.RecycleComment.findByPk(req.params.commentId);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  if (comment.userId !== req.user.id) {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    throw new ErrClass(ErrInfo.BadRequest, '댓글 내용을 입력해주세요.');
  }

  await comment.update({ content: content.trim() });

  const result = await models.RecycleComment.findByPk(comment.id, {
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

// 댓글 삭제
export const deleteComment = async (req, res) => {
  const comment = await models.RecycleComment.findByPk(req.params.commentId);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }
  if (comment.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ErrClass(ErrInfo.Forbidden);
  }

  await comment.destroy();
  res.json({ message: 'ok' });
};
