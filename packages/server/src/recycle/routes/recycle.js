import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getRecycles,
  getRecycle,
  presignImages,
  createRecycle,
  updateRecycle,
  updateStatus,
  deleteRecycle,
  deleteMedia,
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/recycle.js';

const router = express.Router();

// 목록 (커서 페이지네이션)
router.get('/', asyncHandler(getRecycles));

// 이미지 Presigned URL 발급
router.post('/presign', asyncHandler(presignImages));

// 상세
router.get('/:id', asyncHandler(getRecycle));

// 생성 (title + content + mediaKeys)
router.post('/', asyncHandler(createRecycle));

// 수정
router.put('/:id', asyncHandler(updateRecycle));

// 공유 상태 변경
router.patch('/:id/status', asyncHandler(updateStatus));

// 삭제 (소프트 딜리트)
router.delete('/:id', asyncHandler(deleteRecycle));

// 개별 이미지 삭제
router.delete('/media/:mediaId', asyncHandler(deleteMedia));

// 댓글 목록
router.get('/:id/comments', asyncHandler(getComments));

// 댓글 작성
router.post('/:id/comments', asyncHandler(createComment));

// 댓글 수정
router.put('/comments/:commentId', asyncHandler(updateComment));

// 댓글 삭제
router.delete('/comments/:commentId', asyncHandler(deleteComment));

export default router;
