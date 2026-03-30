# Lordhill Church SNS

교회 40명 성인 멤버용 비공개 SNS. 연습 목적 포함.

## Architecture

- Monorepo (npm workspaces): `packages/app-front`, `packages/admin-front`, `packages/server`
- Server: Express.js + Prisma + MySQL (port 3307) + AWS S3 (LocalStack 4566)
- Frontend: React + Vite + TailwindCSS v4 + Zustand + React Router
- Auth: Google/Kakao/Naver OAuth (Passport.js) + JWT (Bearer + Cookie)
- Mobile: Capacitor (아직 미구현, Android Studio/Xcode 필요)

## Dev Commands

```bash
docker compose up -d              # MySQL + LocalStack 시작
npm run dev:server                # Express 서버 (port 3001)
npm run dev:app                   # app-front (port 5173)
npm run dev:admin                 # admin-front (port 5174)
npm run build:app                 # app-front 빌드
npm run build:admin               # admin-front 빌드
cd packages/server && npx prisma migrate dev   # DB 마이그레이션
cd packages/server && npx prisma studio        # DB GUI
```

## Key Design Decisions (from /autoplan review)

- Capacitor 모바일: Bearer 토큰 (`@capacitor/preferences`), 웹: httpOnly 쿠키. 서버는 둘 다 지원.
- OAuth: auth code 교환 방식 (URL에 토큰 노출 방지). 커스텀 URL scheme `lordhill://auth/callback`.
- 이미지: Sharp 리사이즈 (1920px, JPEG 80%) 후 S3 업로드. 동영상: Presigned URL 직접 업로드 + confirm 단계.
- Soft delete: posts, comments (deleted_at). Prisma Client Extensions로 자동 필터.
- 페이지네이션: 피드=cursor (created_at+id), 댓글=offset.
- 보안: CORS, Rate Limit, XSS escape, SameSite=Lax, Helmet, Zod validation, Admin Audit Log.
- 동영상 썸네일: MVP에서는 placeholder. ffmpeg은 post-MVP.

## Database

MySQL + Prisma. 6 테이블: users, posts, post_media, likes, comments, admin_audit_logs.
Schema: `packages/server/prisma/schema.prisma`

## Environment

서버 환경변수: `packages/server/.env` (`.env.example` 참고)
- DB: `mysql://root:rootpassword@localhost:3307/lordhill_sns`
- S3: LocalStack `http://localhost:4566`
- Server port: 3001

## Plan & Design Docs

- Implementation Plan: `PLAN.md` (이 레포 루트)
- Design Doc: `~/.gstack/projects/HyeoseokLee-lordhill-church-sns/hyeonseoklee-main-design-20260330-215627.md`
- Test Plan: `~/.gstack/projects/HyeoseokLee-lordhill-church-sns/hyeonseoklee-main-test-plan-20260330.md`

## Implementation Status

- ✅ Phase 1: Monorepo + Docker + Express + Prisma + Google OAuth
- ✅ Phase 2: Image upload (Sharp) + Video presigned URL
- ✅ Phase 3: app-front (login, feed, post, comments, profile)
- ✅ Phase 4: admin-front (dashboard, user mgmt, content mgmt)
- ✅ Phase 5: Kakao/Naver OAuth (server + frontend)
- ⬜ Phase 5b: Capacitor mobile wrapper (needs Android Studio/Xcode)
- ⬜ 배포 환경 설정
- ⬜ 각 OAuth provider API 키 설정

## Testing

아직 테스트 프레임워크 미설정. 테스트 계획은 위 Test Plan 참고.
테스트 프레임워크 세팅 시: Jest + Supertest (서버), React Testing Library (프론트).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
