const express = require('express');
const { z } = require('zod');
const { authenticate, requireApproved } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const prisma = require('../config/db');

const router = express.Router();

const createCommentSchema = z.object({
  content: z.string().min(1, '댓글 내용을 입력해주세요.').max(500, '최대 500자까지 입력 가능합니다.'),
});

// 댓글 목록 (offset 페이지네이션)
router.get('/posts/:postId/comments', authenticate, requireApproved, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { postId, deletedAt: null },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, nickname: true, profileImageUrl: true, status: true } },
      },
    }),
    prisma.comment.count({ where: { postId, deletedAt: null } }),
  ]);

  const result = comments.map((c) => ({
    ...c,
    author:
      c.author.status === 'DEACTIVATED'
        ? { id: c.author.id, nickname: '탈퇴한 사용자', profileImageUrl: null, status: 'DEACTIVATED' }
        : c.author,
  }));

  res.json({ comments: result, total, page, totalPages: Math.ceil(total / limit) });
});

// 댓글 작성
router.post('/posts/:postId/comments', authenticate, requireApproved, validate(createCommentSchema), async (req, res) => {
  const postId = parseInt(req.params.postId, 10);

  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: req.user.id,
      content: req.validated.content,
    },
    include: {
      author: { select: { id: true, nickname: true, profileImageUrl: true } },
    },
  });

  res.status(201).json(comment);
});

// 댓글 삭제 (soft delete)
router.delete('/comments/:id', authenticate, requireApproved, async (req, res) => {
  const commentId = parseInt(req.params.id, 10);

  const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } });
  if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
  if (comment.authorId !== req.user.id) return res.status(403).json({ error: '본인의 댓글만 삭제할 수 있습니다.' });

  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  res.json({ message: '삭제되었습니다.' });
});

module.exports = router;
