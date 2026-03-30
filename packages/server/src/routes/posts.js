const express = require('express');
const { z } = require('zod');
const { GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authenticate, requireApproved } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { imageUpload, resizeAndUpload, generateKey, BUCKET } = require('../middleware/upload');
const s3 = require('../config/s3');
const prisma = require('../config/db');

const router = express.Router();

const createPostSchema = z.object({
  content: z.string().max(2000, '최대 2000자까지 입력 가능합니다.').optional().default(''),
});

const updatePostSchema = z.object({
  content: z.string().max(2000, '최대 2000자까지 입력 가능합니다.'),
});

// 피드 목록 (cursor 페이지네이션)
router.get('/', authenticate, requireApproved, async (req, res) => {
  const limit = 20;
  const cursor = req.query.cursor;

  const where = { deletedAt: null };

  if (cursor) {
    const [timestamp, id] = cursor.split('_');
    where.OR = [
      { createdAt: { lt: new Date(timestamp) } },
      { createdAt: new Date(timestamp), id: { lt: parseInt(id, 10) } },
    ];
  }

  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      author: { select: { id: true, nickname: true, profileImageUrl: true, status: true } },
      media: { orderBy: { order: 'asc' } },
      _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  // 탈퇴한 사용자 처리
  const result = items.map((post) => ({
    ...post,
    author:
      post.author.status === 'DEACTIVATED'
        ? { id: post.author.id, nickname: '탈퇴한 사용자', profileImageUrl: null, status: 'DEACTIVATED' }
        : post.author,
  }));

  const nextCursor = hasMore
    ? `${items[items.length - 1].createdAt.toISOString()}_${items[items.length - 1].id}`
    : null;

  res.json({ posts: result, nextCursor });
});

// 포스트 작성 (이미지 포함)
router.post('/', authenticate, requireApproved, imageUpload.array('images', 10), async (req, res) => {
  const content = req.body.content || '';
  if (content.length > 2000) {
    return res.status(400).json({ error: '최대 2000자까지 입력 가능합니다.' });
  }

  const post = await prisma.post.create({
    data: {
      authorId: req.user.id,
      content,
    },
  });

  // 이미지 리사이즈 + S3 업로드
  if (req.files?.length > 0) {
    const mediaPromises = req.files.map(async (file, index) => {
      const key = generateKey('posts', file.originalname);
      const url = await resizeAndUpload(file.buffer, key);
      return prisma.postMedia.create({
        data: {
          postId: post.id,
          mediaType: 'IMAGE',
          url,
          order: index,
          confirmed: true,
        },
      });
    });
    await Promise.all(mediaPromises);
  }

  const result = await prisma.post.findFirst({
    where: { id: post.id },
    include: {
      author: { select: { id: true, nickname: true, profileImageUrl: true } },
      media: { orderBy: { order: 'asc' } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.status(201).json(result);
});

// 동영상 Presigned URL 발급
router.post('/:id/upload-url', authenticate, requireApproved, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });

  if (!post) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
  if (post.authorId !== req.user.id) return res.status(403).json({ error: '본인의 포스트에만 업로드할 수 있습니다.' });

  const { contentType, fileName } = req.body;
  const allowedTypes = ['video/mp4', 'video/quicktime'];
  if (!allowedTypes.includes(contentType)) {
    return res.status(400).json({ error: 'mp4, mov 형식만 허용됩니다.' });
  }

  const key = generateKey('videos', fileName || 'video.mp4');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  // post_media 레코드 생성 (미확인 상태)
  const media = await prisma.postMedia.create({
    data: {
      postId,
      mediaType: 'VIDEO',
      url: key, // 확인 후 전체 URL로 업데이트
      order: 0,
      confirmed: false,
    },
  });

  res.json({ uploadUrl: signedUrl, mediaId: media.id, key });
});

// 동영상 업로드 확인
router.post('/:id/media/confirm', authenticate, requireApproved, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { mediaId } = req.body;

  const media = await prisma.postMedia.findFirst({
    where: { id: mediaId, postId, confirmed: false },
  });

  if (!media) return res.status(404).json({ error: '미디어를 찾을 수 없습니다.' });

  // S3에서 객체 존재 확인
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: media.url }));
  } catch {
    return res.status(400).json({ error: '파일이 아직 업로드되지 않았습니다.' });
  }

  const endpoint = process.env.AWS_S3_ENDPOINT;
  const fullUrl = endpoint
    ? `${endpoint}/${BUCKET}/${media.url}`
    : `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${media.url}`;

  await prisma.postMedia.update({
    where: { id: mediaId },
    data: { url: fullUrl, confirmed: true },
  });

  res.json({ message: '업로드 확인 완료', url: fullUrl });
});

// 포스트 상세
router.get('/:id', authenticate, requireApproved, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    include: {
      author: { select: { id: true, nickname: true, profileImageUrl: true, status: true } },
      media: { orderBy: { order: 'asc' } },
      _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
    },
  });

  if (!post) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });

  res.json(post);
});

// 포스트 수정 (텍스트만)
router.patch('/:id', authenticate, requireApproved, validate(updatePostSchema), async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });

  if (!post) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
  if (post.authorId !== req.user.id) return res.status(403).json({ error: '본인의 포스트만 수정할 수 있습니다.' });

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { content: req.validated.content },
    include: {
      author: { select: { id: true, nickname: true, profileImageUrl: true } },
      media: { orderBy: { order: 'asc' } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json(updated);
});

// 포스트 삭제 (soft delete)
router.delete('/:id', authenticate, requireApproved, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });

  if (!post) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
  if (post.authorId !== req.user.id) return res.status(403).json({ error: '본인의 포스트만 삭제할 수 있습니다.' });

  await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
  res.json({ message: '삭제되었습니다.' });
});

// 좋아요 토글
router.post('/:id/like', authenticate, requireApproved, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    res.json({ liked: false });
  } else {
    try {
      await prisma.like.create({ data: { userId, postId } });
      res.json({ liked: true });
    } catch (err) {
      if (err.code === 'P2002') {
        // Race condition: 이미 생성됨. 멱등 응답.
        return res.json({ liked: true });
      }
      throw err;
    }
  }
});

module.exports = router;
