import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getOfferingStatistics,
  getFundStatistics,
} from '../controllers/statistics.js';

const router = express.Router();

// 헌금 통계 조회
router.get('/offerings', asyncHandler(getOfferingStatistics));

// 울타리기금 통계 조회
router.get('/fund', asyncHandler(getFundStatistics));

export default router;
