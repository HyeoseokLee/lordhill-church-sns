import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getActiveEvent,
  submitOrder,
  deleteOrder,
  getOrderSummary,
  toggleMyPaid,
} from '../controllers/meal.js';

const router = express.Router();

// 현재 활성 이벤트 + 내 주문 조회
router.get('/active', asyncHandler(getActiveEvent));

// 주문 생성/수정
router.post('/orders', asyncHandler(submitOrder));

// 주문 삭제 (취소)
router.delete('/orders/:eventId', asyncHandler(deleteOrder));

// 전체 주문 현황 (요약 테이블)
router.get('/events/:eventId/summary', asyncHandler(getOrderSummary));

// 본인 주문 입금 토글
router.patch('/orders/:orderId/paid', asyncHandler(toggleMyPaid));

export default router;
