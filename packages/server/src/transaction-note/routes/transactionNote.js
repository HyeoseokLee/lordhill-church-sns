import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getCategoryNotes,
  upsertCategoryNote,
  deleteCategoryNote,
} from '../controllers/transactionNote.js';

const router = express.Router();

// 연도별 카테고리 메모 목록 조회
router.get('/category-notes', asyncHandler(getCategoryNotes));

// 카테고리 메모 저장 (같은 칸이면 덮어쓰기)
router.put('/category-notes', asyncHandler(upsertCategoryNote));

// 카테고리 메모 삭제
router.delete('/category-notes/:id', asyncHandler(deleteCategoryNote));

export default router;
