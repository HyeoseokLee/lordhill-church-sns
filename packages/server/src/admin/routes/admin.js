import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getUsers,
  approveUser,
  rejectUser,
  deletePostByAdmin,
  deleteCommentByAdmin,
  getDashboard,
} from '../controllers/admin.js';

const router = express.Router();

// 대시보드
router.get('/dashboard', asyncHandler(getDashboard));

// 회원 목록
router.get('/users', asyncHandler(getUsers));

// 회원 승인
router.patch('/users/:id/approve', asyncHandler(approveUser));

// 회원 거절
router.patch('/users/:id/reject', asyncHandler(rejectUser));

// 포스트 강제 삭제
router.delete('/posts/:id', asyncHandler(deletePostByAdmin));

// 댓글 강제 삭제
router.delete('/comments/:id', asyncHandler(deleteCommentByAdmin));

export default router;
