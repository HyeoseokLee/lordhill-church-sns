import express from 'express';
import asyncHandler from 'express-async-handler';
import { registerFcmToken, deleteFcmToken } from '../controllers/fcmToken.js';

const router = express.Router();

// FCM 토큰 등록/갱신
router.post('/fcm-token', asyncHandler(registerFcmToken));

// FCM 토큰 삭제 (로그아웃 시)
router.delete('/fcm-token', asyncHandler(deleteFcmToken));

export default router;
