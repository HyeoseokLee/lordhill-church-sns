const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { generateTokens, authenticate } = require('../middleware/auth');
const prisma = require('../config/db');

const router = express.Router();

// 공통 OAuth 콜백 핸들러
function oauthCallbackHandler(req, res) {
  const { accessToken, refreshToken } = generateTokens(req.user);

  // 웹 브라우저: 쿠키 설정
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth/refresh',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  // Capacitor 앱: auth code 방식
  const redirectUrl = req.query.redirect || req.query.state;
  if (redirectUrl?.startsWith('lordhill://')) {
    const authCode = jwt.sign(
      { userId: req.user.id, type: 'auth_code' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.redirect(`${redirectUrl}?code=${authCode}`);
  }

  res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
}

// ─── Google ───
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  oauthCallbackHandler
);

// ─── Kakao ───
router.get('/kakao', passport.authenticate('kakao', { session: false }));
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { session: false, failureRedirect: '/auth/failure' }),
  oauthCallbackHandler
);

// ─── Naver ───
router.get('/naver', passport.authenticate('naver', { session: false }));
router.get(
  '/naver/callback',
  passport.authenticate('naver', { session: false, failureRedirect: '/auth/failure' }),
  oauthCallbackHandler
);

// Auth code → 토큰 교환 (Capacitor 앱용)
router.post('/exchange', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'code가 필요합니다.' });
  }

  try {
    const payload = jwt.verify(code, process.env.JWT_SECRET);
    if (payload.type !== 'auth_code') {
      return res.status(400).json({ error: '유효하지 않은 코드입니다.' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    res.json({ accessToken, refreshToken, user: { id: user.id, status: user.status, role: user.role } });
  } catch (err) {
    res.status(400).json({ error: '만료되었거나 유효하지 않은 코드입니다.' });
  }
});

// JWT 리프레시
router.post('/refresh', async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token이 필요합니다.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.status === 'DEACTIVATED') {
      return res.status(401).json({ error: '유효하지 않은 사용자입니다.' });
    }

    const tokens = generateTokens(user);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,
    });

    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    res.status(401).json({ error: '만료된 Refresh token입니다.' });
  }
});

// 로그아웃
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/auth/refresh' });
  res.json({ message: '로그아웃 되었습니다.' });
});

// 내 상태 확인
router.get('/me', authenticate, (req, res) => {
  const { id, email, nickname, profileImageUrl, role, status } = req.user;
  res.json({ id, email, nickname, profileImageUrl, role, status });
});

// OAuth 실패 핸들러
router.get('/failure', (req, res) => {
  res.status(401).json({ error: '로그인에 실패했습니다. 다시 시도해주세요.' });
});

module.exports = router;
