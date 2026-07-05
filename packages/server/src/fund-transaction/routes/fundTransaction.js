import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  bulkCreateFundTransactions,
  getFundTransactions,
} from '../controllers/fundTransaction.js';

const router = express.Router();

// 울타리기금 거래내역 벌크 저장
router.post(
  '/fund-transactions/bulk',
  asyncHandler(bulkCreateFundTransactions),
);

// 울타리기금 거래내역 목록 조회
router.get('/fund-transactions', asyncHandler(getFundTransactions));

export default router;
