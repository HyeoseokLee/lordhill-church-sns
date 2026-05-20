import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getUsers,
  approveUser,
  rejectUser,
  deactivateUser,
  deleteUser,
  restoreUser,
  deletePostByAdmin,
  deleteCommentByAdmin,
  getDashboard,
} from '../controllers/admin.js';
import { sendPush, getPushLogs } from '../controllers/push.js';

const router = express.Router();

// 대시보드
router.get('/dashboard', asyncHandler(getDashboard));

// 회원 목록
router.get('/users', asyncHandler(getUsers));

// 회원 승인
router.patch('/users/:id/approve', asyncHandler(approveUser));

// 회원 거절
router.patch('/users/:id/reject', asyncHandler(rejectUser));

// 회원 계정잠금/해제
router.patch('/users/:id/deactivate', asyncHandler(deactivateUser));

// 회원 삭제
router.delete('/users/:id', asyncHandler(deleteUser));

// 삭제된 회원 복구
router.patch('/users/:id/restore', asyncHandler(restoreUser));

// 포스트 강제 삭제
router.delete('/posts/:id', asyncHandler(deletePostByAdmin));

// 댓글 강제 삭제
router.delete('/comments/:id', asyncHandler(deleteCommentByAdmin));

// 푸시 알림 전송
router.post('/push/send', asyncHandler(sendPush));

// 푸시 이력 조회
router.get('/push/logs', asyncHandler(getPushLogs));

export default router;
