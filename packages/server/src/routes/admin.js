const express = require('express');
const { authenticate, requireApproved, requireAdmin } = require('../middleware/auth');
const prisma = require('../config/db');

const router = express.Router();

// 관리자 미들웨어
router.use(authenticate, requireApproved, requireAdmin);

// 회원 목록
router.get('/users', async (req, res) => {
  const status = req.query.status;
  const where = status ? { status: status.toUpperCase() } : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      nickname: true,
      profileImageUrl: true,
      provider: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  res.json(users);
});

// 회원 승인
router.patch('/users/:id/approve', async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: 'APPROVED' },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: req.user.id,
      action: 'APPROVE_USER',
      targetType: 'USER',
      targetId: userId,
    },
  });

  res.json({ message: `${user.email} 승인 완료`, user: { id: user.id, status: user.status } });
});

// 회원 거절
router.patch('/users/:id/reject', async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: 'REJECTED' },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: req.user.id,
      action: 'REJECT_USER',
      targetType: 'USER',
      targetId: userId,
    },
  });

  res.json({ message: `${user.email} 거절 완료`, user: { id: user.id, status: user.status } });
});

// 포스트 강제 삭제 (soft delete)
router.delete('/posts/:id', async (req, res) => {
  const postId = parseInt(req.params.id, 10);

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: req.user.id,
      action: 'DELETE_POST',
      targetType: 'POST',
      targetId: postId,
    },
  });

  res.json({ message: '포스트가 삭제되었습니다.' });
});

// 댓글 강제 삭제 (soft delete)
router.delete('/comments/:id', async (req, res) => {
  const commentId = parseInt(req.params.id, 10);

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: req.user.id,
      action: 'DELETE_COMMENT',
      targetType: 'COMMENT',
      targetId: commentId,
    },
  });

  res.json({ message: '댓글이 삭제되었습니다.' });
});

module.exports = router;
