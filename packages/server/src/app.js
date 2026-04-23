import config from 'config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errHandler } from './err.js';
import logger, { middleware as loggerMiddleware } from './logger.js';
import { onlyLoginUser, onlyApprovedUser, onlyAdmin } from './middlewares.js';
import passportConfig from './passport/index.js';
import { checkUserToken } from './passport/jwtStrategy.js';
import authRouter from './user/routes/auth.js';
import usersRouter from './user/routes/my.js';
import postsRouter from './post/routes/post.js';
import commentRouter from './comment/routes/comment.js';
import adminRouter from './admin/routes/admin.js';

const app = express();
app.disable('x-powered-by');

// 미들웨어
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  }),
);
app.use(helmet());
app.use(loggerMiddleware());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport
passportConfig();

// Health check (인증 불필요)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API 라우터
const apiRouter = express.Router();

// 인증
apiRouter.use('/auth', authRouter);

// 유저 (승인된 사용자만)
apiRouter.use('/users', onlyLoginUser, onlyApprovedUser, usersRouter);

// 포스트 (승인된 사용자만)
apiRouter.use('/posts', onlyLoginUser, onlyApprovedUser, postsRouter);

// 댓글 (승인된 사용자만)
apiRouter.use('/', onlyLoginUser, onlyApprovedUser, commentRouter);

// 관리자
apiRouter.use('/admin', onlyLoginUser, onlyAdmin, adminRouter);

// /api 프리픽스로 마운트 + 토큰 체크
app.use('/api', checkUserToken, apiRouter);

// 에러 핸들러
app.use(errHandler);

export default app;
