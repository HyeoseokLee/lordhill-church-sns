import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getUsers,
  approveUser,
  rejectUser,
  deactivateUser,
  deleteUser,
  restoreUser,
  getPosts,
  deletePostByAdmin,
  restorePost,
  permanentDeletePost,
  deleteCommentByAdmin,
  restoreComment,
  permanentDeleteComment,
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

// 어드민 게시글 목록
router.get('/posts', asyncHandler(getPosts));

// 포스트 강제 삭제
router.delete('/posts/:id', asyncHandler(deletePostByAdmin));

// 삭제된 포스트 복구
router.patch('/posts/:id/restore', asyncHandler(restorePost));

// 포스트 영구삭제 (하드 딜리트 + S3 이미지 삭제)
router.delete('/posts/:id/permanent', asyncHandler(permanentDeletePost));

// 댓글 강제 삭제
router.delete('/comments/:id', asyncHandler(deleteCommentByAdmin));

// 삭제된 댓글 복구
router.patch('/comments/:id/restore', asyncHandler(restoreComment));

// 댓글 영구삭제 (하드 딜리트)
router.delete('/comments/:id/permanent', asyncHandler(permanentDeleteComment));

// 푸시 알림 전송
router.post('/push/send', asyncHandler(sendPush));

// 푸시 이력 조회
router.get('/push/logs', asyncHandler(getPushLogs));

export default router;
