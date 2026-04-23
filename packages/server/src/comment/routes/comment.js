import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getComments,
  createComment,
  deleteComment,
} from '../controllers/comment.js';

const router = express.Router();

// 댓글 목록 (offset 페이지네이션)
router.get('/posts/:postId/comments', asyncHandler(getComments));

// 댓글 작성
router.post('/posts/:postId/comments', asyncHandler(createComment));

// 댓글 삭제 (soft delete)
router.delete('/comments/:id', asyncHandler(deleteComment));

export default router;
