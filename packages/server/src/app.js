import config from 'config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errHandler } from './err.js';
import { middleware as loggerMiddleware } from './logger.js';
import { onlyLoginUser, onlyApprovedUser, onlyAdmin } from './middlewares.js';
import passportConfig from './passport/index.js';
import { checkUserToken } from './passport/jwtStrategy.js';
import authRouter from './user/routes/auth.js';
import usersRouter from './user/routes/my.js';
import postsRouter from './post/routes/post.js';
import commentRouter from './comment/routes/comment.js';
import adminRouter from './admin/routes/admin.js';
import adminAuthRouter from './admin/routes/auth.js';
import fcmTokenRouter from './push/routes/fcmToken.js';
import pushRouter from './push/routes/push.js';
import recycleRouter from './recycle/routes/recycle.js';
import counterpartyRouter from './counterparty/routes/counterparty.js';
import transactionCategoryRouter from './transaction-category/routes/transactionCategory.js';
import transactionRouter from './transaction/routes/transaction.js';
import statisticsRouter from './statistics/routes/statistics.js';

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

// 돌고래/재활용 (승인된 사용자만)
apiRouter.use('/recycles', onlyLoginUser, onlyApprovedUser, recycleRouter);

// 알림 (승인된 사용자)
apiRouter.use('/pushs', onlyLoginUser, onlyApprovedUser, pushRouter);

// 푸시 토큰 (로그인한 사용자)
apiRouter.use('/users', onlyLoginUser, fcmTokenRouter);

// 통계 (승인된 사용자)
apiRouter.use('/statistics', onlyLoginUser, onlyApprovedUser, statisticsRouter);

// 어드민 (로그인은 인증 불필요, 나머지는 admin 권한 필요)
apiRouter.use('/admin', adminAuthRouter);
apiRouter.use('/admin', onlyLoginUser, onlyAdmin, adminRouter);
apiRouter.use('/admin', onlyLoginUser, onlyAdmin, counterpartyRouter);
apiRouter.use('/admin', onlyLoginUser, onlyAdmin, transactionCategoryRouter);
apiRouter.use('/admin', onlyLoginUser, onlyAdmin, transactionRouter);

// 댓글 (승인된 사용자만 — use('/')는 모든 경로에 매칭되므로 반드시 마지막에 배치)
apiRouter.use('/', onlyLoginUser, onlyApprovedUser, commentRouter);

// /api 프리픽스로 마운트 + 토큰 체크
app.use('/api', checkUserToken, apiRouter);

// 에러 핸들러
app.use(errHandler);

export default app;
