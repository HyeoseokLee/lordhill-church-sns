import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedIds,
} from '../controllers/block.js';

const router = express.Router();

// 내가 차단한 유저 목록
router.get('/', asyncHandler(getBlockedUsers));

// 내가 차단한 유저 ID 목록
router.get('/ids', asyncHandler(getBlockedIds));

// 사용자 차단
router.post('/:userId', asyncHandler(blockUser));

// 사용자 차단 해제
router.delete('/:userId', asyncHandler(unblockUser));

export default router;
