import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getSuggestions,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  createSuggestionComment,
  updateSuggestionComment,
  deleteSuggestionComment,
} from '../controllers/suggestion.js';

const router = express.Router();

// 개선요청 목록 조회
router.get('/', asyncHandler(getSuggestions));

// 개선요청 작성
router.post('/', asyncHandler(createSuggestion));

// 개선요청 수정 (본인만)
router.patch('/:id', asyncHandler(updateSuggestion));

// 개선요청 삭제 (본인만, 댓글 일괄 삭제)
router.delete('/:id', asyncHandler(deleteSuggestion));

// 개선요청 댓글 작성
router.post('/:id/comments', asyncHandler(createSuggestionComment));

// 개선요청 댓글 수정 (본인만)
router.patch('/comments/:commentId', asyncHandler(updateSuggestionComment));

// 개선요청 댓글 삭제 (본인만)
router.delete('/comments/:commentId', asyncHandler(deleteSuggestionComment));

export default router;
