import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getFeed,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  presignImages,
} from '../controllers/post.js';

const router = express.Router();

// 피드 (cursor 페이지네이션)
router.get('/', asyncHandler(getFeed));

// 포스트 상세
router.get('/:id', asyncHandler(getPost));

// 이미지 Presigned URL 발급
router.post('/presign', asyncHandler(presignImages));

// 포스트 작성 (content + mediaKeys)
router.post('/', asyncHandler(createPost));

// 포스트 수정
router.put('/:id', asyncHandler(updatePost));

// 포스트 삭제 (soft delete)
router.delete('/:id', asyncHandler(deletePost));

// 좋아요 토글
router.post('/:id/like', asyncHandler(toggleLike));

export default router;
