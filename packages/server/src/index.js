require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어
app.use(helmet());
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', process.env.ADMIN_URL || 'http://localhost:5174'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10,
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10,
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
});

// XSS 방지: 텍스트 escape 유틸
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 모든 요청의 body 문자열 필드 자동 escape
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = escapeHtml(req.body[key]);
      }
    }
  }
  next();
});

// 라우트
app.use('/auth', authLimiter, authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postLimiter, postRoutes);
app.use('/', commentLimiter, commentRoutes);
app.use('/admin', adminRoutes);

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
