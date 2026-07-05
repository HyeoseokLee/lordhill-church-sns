import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  bulkCreateTransactions,
  getTransactions,
  updateTransaction,
} from '../controllers/transaction.js';

const router = express.Router();

// 거래내역 벌크 저장
router.post('/transactions/bulk', asyncHandler(bulkCreateTransactions));

// 거래내역 목록 조회
router.get('/transactions', asyncHandler(getTransactions));

// 거래내역 개별 수정
router.patch('/transactions/:id', asyncHandler(updateTransaction));

export default router;
