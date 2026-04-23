import express from 'express';
import asyncHandler from 'express-async-handler';
import { refreshToken, logout, getMe, devLogin } from '../controllers/auth.js';
import { onlyLoginUser } from '../../middlewares.js';

const router = express.Router();

// OAuth 콜백 (Google, Kakao, Naver)
// TODO: passport.authenticate 연결
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google', { session: false }), asyncHandler(oauthCallback));

// Dev 로그인 (프로덕션 차단)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', asyncHandler(devLogin));
}

// 토큰 리프레시
router.post('/refresh', asyncHandler(refreshToken));

// 로그아웃
router.post('/logout', asyncHandler(logout));

// 내 정보 (인증 필요)
router.get('/me', onlyLoginUser, asyncHandler(getMe));

export default router;
