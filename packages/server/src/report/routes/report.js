import express from 'express';
import asyncHandler from 'express-async-handler';
import { createReport, getMyReports } from '../controllers/report.js';

const router = express.Router();

// 내 신고 내역 조회
router.get('/mine', asyncHandler(getMyReports));

// 신고 생성
router.post('/', asyncHandler(createReport));

export default router;
