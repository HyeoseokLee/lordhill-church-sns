import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getTransactionCategories,
  createTransactionCategory,
  updateTransactionCategory,
  deleteTransactionCategory,
} from '../controllers/transactionCategory.js';

const router = express.Router();

// 거래 카테고리 목록 (?type=income|expense)
router.get('/transaction-categories', asyncHandler(getTransactionCategories));

// 거래 카테고리 등록
router.post('/transaction-categories', asyncHandler(createTransactionCategory));

// 거래 카테고리 수정
router.patch(
  '/transaction-categories/:id',
  asyncHandler(updateTransactionCategory),
);

// 거래 카테고리 삭제 (soft delete)
router.delete(
  '/transaction-categories/:id',
  asyncHandler(deleteTransactionCategory),
);

export default router;
