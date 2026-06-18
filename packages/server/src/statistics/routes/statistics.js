import express from 'express';
import asyncHandler from 'express-async-handler';
import { getOfferingStatistics } from '../controllers/statistics.js';

const router = express.Router();

// 헌금 통계 조회
router.get('/offerings', asyncHandler(getOfferingStatistics));

export default router;
