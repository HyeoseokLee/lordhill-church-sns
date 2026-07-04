import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getSuggestions,
  createSuggestion,
  createSuggestionComment,
} from '../controllers/suggestion.js';

const router = express.Router();

// 개선요청 목록 조회
router.get('/', asyncHandler(getSuggestions));

// 개선요청 작성
router.post('/', asyncHandler(createSuggestion));

// 개선요청 댓글 작성
router.post('/:id/comments', asyncHandler(createSuggestionComment));

export default router;
