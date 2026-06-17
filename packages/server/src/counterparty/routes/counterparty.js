import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getCounterparties,
  createCounterparty,
  updateCounterparty,
  deleteCounterparty,
} from '../controllers/counterparty.js';

const router = express.Router();

// 거래처 목록
router.get('/counterparties', asyncHandler(getCounterparties));

// 거래처 등록
router.post('/counterparties', asyncHandler(createCounterparty));

// 거래처 수정
router.patch('/counterparties/:id', asyncHandler(updateCounterparty));

// 거래처 삭제 (hard delete)
router.delete('/counterparties/:id', asyncHandler(deleteCounterparty));

export default router;
