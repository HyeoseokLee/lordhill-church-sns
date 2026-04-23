# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
# 개발 서버 (port 3001, auto-reload)
npm run dev
# 또는 모노레포 루트에서: npm run dev:server

# 프로덕션 실행
npm run start

# 린트 / 포맷
npm run lint          # prettier --check
npm run format        # prettier --write

# Sequelize 마이그레이션
npm run mig-all              # 미실행 마이그레이션 전체 실행
npm run undo-migration       # 마지막 마이그레이션 롤백
npm run migration -- <name>  # 새 마이그레이션 파일 생성
npm run db:seed              # 시더 전체 실행

# Docker (모노레포 루트에서)
docker compose up -d   # MySQL (3307) + LocalStack (4566)
```

**주의**: 스크립트에 `NODE_CONFIG_DIR=./config`가 필요하며 package.json에 이미 설정되어 있음. 모노레포 루트에서 실행 시 `npm run dev:server` 사용.

## 아키텍처

ESM 모듈 (`"type": "module"`) 기반, healthcare-api-server 패턴을 따르는 도메인별 폴더 구조.

### 진입 흐름

`src/index.js` → dotenv 로드, Sequelize DB 연결 확인, HTTP 서버 시작
`src/app.js` → Express 미들웨어 체인: CORS → Helmet → logger → body-parser → cookie-parser → Passport → 라우트 → 에러 핸들러

### 도메인 구조

각 도메인(`user/`, `post/`, `comment/`, `admin/`)은 `models/`, `controllers/`, `routes/` 하위 디렉토리를 포함. 모든 모델은 `src/db.js`에서 등록 및 association 설정.

### 핵심 모듈

- **`src/db.js`** — Sequelize 인스턴스, 모델 등록, association. `models`(default export)와 `getPoolStats()` 제공
- **`src/err.js`** — `ErrInfo` 에러 정의, `ErrClass`(CustomError), `errHandler`(글로벌 에러 핸들러). 모든 도메인 에러가 여기에 사전 정의됨
- **`src/define.js`** — 상수: `userRole`, `userStatus`, `oauthProvider`, `mediaType`, `pagination`, `contentLimit`, `auditAction`
- **`src/middlewares.js`** — `onlyLoginUser`, `onlyApprovedUser`, `onlyAdmin` 인증 미들웨어
- **`src/passport/jwtStrategy.js`** — JWT 추출 (Bearer 헤더 → 쿠키 fallback), `checkUserToken` (비차단, `req.user` 설정)
- **`src/logger.js`** — Winston (콘솔 + DailyRotateFile), 요청/응답 로깅 미들웨어
- **`src/uploader/index.js`** — multer-s3 + Sharp 이미지 리사이즈 (1920px, JPEG 80%). `uploadImage`, `uploadVideo`, `uploadProfileImage` export
- **`src/validator/index.js`** — Zod 기반 요청 검증 미들웨어 (body, query, params)

### 설정

`config` 패키지 사용, `config/default.cjs`에 CJS 설정 파일. DB, JWT, S3, OAuth, rate limit 등 모든 설정이 여기에 집중. `process.env`를 통한 환경변수 오버라이드.

## 데이터베이스

**Sequelize 6 + MySQL** (Prisma 아님 — 루트 CLAUDE.md의 Prisma 언급은 구버전 정보).

6개 모델: User, Post, PostMedia, Like, Comment, AdminAuditLog. Post와 Comment는 `paranoid: true`로 soft delete 적용 (쿼리 시 `deletedAt` 자동 필터).

마이그레이션은 `migrations/` 디렉토리에 CJS 파일로 관리. `migrationLib/createHelper.cjs`의 `defaultCreate`, `deletedAtCreate` 헬퍼 사용.

마이그레이션 설정: `.sequelizerc` → `dbconfig.cjs` (dotenv에서 읽음).

## 인증

이중 토큰 전달: httpOnly 쿠키 (웹) + Bearer 헤더 (모바일/Capacitor). JWT access token (1시간) + refresh token (30일). `checkUserToken`은 모든 라우트에서 비차단으로 실행되며, `onlyLoginUser`가 인증을 강제.

Dev 로그인 (`POST /api/auth/dev-login`)은 `NODE_ENV !== 'production'`일 때만 사용 가능.

## API 라우트

모든 라우트는 `/api` 하위에 마운트:
- `/api/auth` — 공개 (로그인, 토큰 갱신, 로그아웃, 내 정보)
- `/api/users` — 로그인 + approved 상태 필요
- `/api/posts` — 로그인 + approved 상태 필요 (피드: cursor 페이지네이션)
- `/api/comments` — 로그인 + approved 상태 필요 (offset 페이지네이션)
- `/api/admin` — admin 역할 필요 (모든 작업이 AdminAuditLog에 기록됨)

모든 async 핸들러는 `express-async-handler`로 래핑하여 에러를 `errHandler`로 자동 전파.

## 에러 패턴

컨트롤러에서 `new ErrClass(ErrInfo.<에러명>)`을 throw. `src/err.js`의 글로벌 `errHandler`가 응답을 포맷. 원시 에러를 직접 보내지 말고 반드시 사전 정의된 `ErrInfo` 항목을 사용할 것.

## 컨벤션

- **DB 컬럼 네이밍**: Sequelize `underscored: true`로 JS의 camelCase를 SQL의 snake_case로 매핑. 명시적 매핑이 필요한 경우 `field: 'snake_case'` 사용.
- **복합 유니크 인덱스**: users의 `[provider, provider_id]`, likes의 `[user_id, post_id]`.
- **Admin 감사 로그**: 모든 admin 변경 작업은 반드시 `AdminAuditLog`에 action, target, metadata를 기록.
