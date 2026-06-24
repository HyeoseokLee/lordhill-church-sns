import express from 'express';
import asyncHandler from 'express-async-handler';
import { getNotices } from '../controllers/notice.js';

const router = express.Router();

// 공지사항 목록 조회
router.get('/', asyncHandler(getNotices));

export default router;
