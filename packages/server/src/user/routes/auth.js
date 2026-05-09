import express from 'express';
import passport from 'passport';
import config from 'config';
import asyncHandler from 'express-async-handler';
import {
  oauthCallback,
  googleNativeLogin,
  kakaoNativeLogin,
  refreshToken,
  logout,
  getMe,
  devLogin,
} from '../controllers/auth.js';
import { onlyLoginUser } from '../../middlewares.js';

const router = express.Router();

// Google OAuth 로그인 시작
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

// Google OAuth 콜백 처리
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, oauthProfile) => {
      if (err || !oauthProfile) {
        const clientUrl = config.cors.origins[0] || 'http://localhost:5173';
        return res.redirect(`${clientUrl}/login?error=oauth_failed`);
      }
      req.oauthProfile = oauthProfile;
      next();
    })(req, res, next);
  },
  asyncHandler(oauthCallback),
);

// 네이티브 앱 Google 로그인 (idToken 검증)
router.post('/google/native', asyncHandler(googleNativeLogin));

// Kakao OAuth 로그인 시작
router.get(
  '/kakao',
  passport.authenticate('kakao', {
    session: false,
  }),
);

// Kakao OAuth 콜백 처리
router.get(
  '/kakao/callback',
  (req, res, next) => {
    passport.authenticate('kakao', { session: false }, (err, oauthProfile) => {
      if (err || !oauthProfile) {
        const clientUrl = config.cors.origins[0] || 'http://localhost:5173';
        return res.redirect(`${clientUrl}/login?error=oauth_failed`);
      }
      req.oauthProfile = oauthProfile;
      next();
    })(req, res, next);
  },
  asyncHandler(oauthCallback),
);

// 네이티브 앱 Kakao 로그인 (accessToken으로 프로필 조회)
router.post('/kakao/native', asyncHandler(kakaoNativeLogin));

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
