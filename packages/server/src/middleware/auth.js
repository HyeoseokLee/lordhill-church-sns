const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

async function authenticate(req, res, next) {
  // Bearer 헤더 우선 (Capacitor 모바일), 쿠키 폴백 (웹 admin)
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (user.status === 'DEACTIVATED') {
      return res.status(401).json({ error: '비활성화된 계정입니다.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

function requireApproved(req, res, next) {
  if (req.user.status !== 'APPROVED') {
    return res.status(403).json({ error: '관리자 승인이 필요합니다.', status: req.user.status });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

module.exports = { generateTokens, authenticate, requireApproved, requireAdmin };
