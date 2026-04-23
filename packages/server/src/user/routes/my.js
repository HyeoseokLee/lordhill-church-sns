import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getProfile,
  updateProfile,
  getUserProfile,
} from '../controllers/my.js';
import { uploadProfileImage } from '../../uploader/index.js';

const router = express.Router();

// 내 프로필
router.get('/me', asyncHandler(getProfile));

// 프로필 수정
router.patch(
  '/me',
  uploadProfileImage.single('profileImage'),
  asyncHandler(updateProfile),
);

// 다른 유저 프로필
router.get('/:id', asyncHandler(getUserProfile));

export default router;
