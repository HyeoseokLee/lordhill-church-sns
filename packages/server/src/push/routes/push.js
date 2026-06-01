import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getMyPushs,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/push.js';

const router = express.Router();

// 내 알림 목록
router.get('/', asyncHandler(getMyPushs));

// 안 읽은 알림 개수
router.get('/unread-count', asyncHandler(getUnreadCount));

// 알림 읽음 처리
router.patch('/:id/read', asyncHandler(markAsRead));

// 전체 읽음 처리
router.patch('/read-all', asyncHandler(markAllAsRead));

export default router;
