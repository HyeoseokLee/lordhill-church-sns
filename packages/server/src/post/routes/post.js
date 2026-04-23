import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getFeed,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
} from '../controllers/post.js';
import { uploadImage } from '../../uploader/index.js';

const router = express.Router();

// 피드 (cursor 페이지네이션)
router.get('/', asyncHandler(getFeed));

// 포스트 상세
router.get('/:id', asyncHandler(getPost));

// 포스트 작성 (이미지 최대 10장)
router.post('/', uploadImage.array('images', 10), asyncHandler(createPost));

// 포스트 수정 (텍스트만)
router.patch('/:id', asyncHandler(updatePost));

// 포스트 삭제 (soft delete)
router.delete('/:id', asyncHandler(deletePost));

// 좋아요 토글
router.post('/:id/like', asyncHandler(toggleLike));

export default router;
