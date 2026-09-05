# Lordhill Church SNS

교회 40명 성인 멤버용 비공개 SNS. 모바일 웹뷰 앱 (iOS/Android).

## Architecture

- Monorepo (npm workspaces): `packages/app-front`, `packages/admin-front`, `packages/server`
- Server: Express.js + Sequelize 6 + MySQL (Docker port 3307) + AWS S3
- Frontend: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + MUI v9(Drawer 등 복잡 컴포넌트만) + Zustand + SWR + React Router v7
- Auth: Google OAuth (Passport.js) + JWT (Bearer 헤더 + httpOnly 쿠키 듀얼)
- Mobile: WebView 하이브리드 앱 (iOS: SwiftUI+WKWebView, Android: Kotlin+Compose+WebView)
- Icons: Lucide React
- 참고 프로젝트: `~/Documents/cheeze/healthcare/` (healthcare-front, healthcare-api-server, healthcare-ios, healthcare-android)

## Dev Commands

```bash
docker compose up -d              # MySQL (3307) + LocalStack (4566) + Adminer (8081)
npm run dev:server                # Express 서버 (port 3001)
npm run dev:app                   # app-front (port 5173)
npm run dev:admin                 # admin-front (port 5174)
npm run build:app                 # app-front 빌드
npm run check                    # lint + prettier + type-check + build (CI와 동일)
cd packages/server && npm run mig-all     # Sequelize 마이그레이션 실행
cd packages/server && npm run migration -- <name>  # 마이그레이션 파일 생성
```

## Database

MySQL + Sequelize 6. 마이그레이션은 `packages/server/migrations/`. 모델 등록·association은 `src/db.js`.

도메인별 테이블(2026-09 기준 27개):

| 영역 | 테이블 |
|------|--------|
| 회원·SNS | users, posts, post_media, likes, comments, notices, notice_media, user_blocks, reports |
| 회계 | transactions(일반헌금), fund_transactions(울타리기금), counterparties, transaction_categories, transaction_category_notes |
| 식사 | meal_restaurants, meal_menus, meal_events, meal_orders, meal_order_items |
| 재활용 | recycles, recycle_media, recycle_comments |
| 제안 | suggestions, suggestion_comments |
| 푸시 | pushs, push_logs, fcm_tokens |
| 운영 | admin_audit_logs |

대부분의 콘텐츠 테이블은 `paranoid: true` (soft delete).

**주의**: soft delete와 UNIQUE 인덱스를 함께 쓰면 삭제된 행이 유니크 자리를 계속 점유한다.
같은 키로 다시 만들 수 없으므로, upsert 시 `paranoid: false`로 조회 후 `restore()`해야 한다
(`transaction_category_notes`가 이 패턴을 쓴다).

- 로컬 Adminer: `http://localhost:8081` (서버: `mysql`, 사용자: `root`, 비밀번호: `rootpassword`)
- 라이브 DB: TiDB Cloud Serverless (MySQL CLI로 접속, `--ssl-mode=REQUIRED` 필수)

## Environment

서버 환경변수: `packages/server/.env`
- DB: localhost:3307, root/rootpassword, lordhill_sns
- S3: LocalStack `http://localhost:4566`
- Server port: 3001
- Google OAuth: Client ID/Secret은 .env에 설정

## Live (Production)

- 도메인: `lordhill-sns.kr` (가비아, 루트→www 포워딩)
- 프론트: `https://www.lordhill-sns.kr` (CloudFront: `d3r7fh2kgsbnqt.cloudfront.net`)
- API 서버: `https://api.lordhill-sns.kr` (Fly.io, Docker 컨테이너)
- DB: TiDB Cloud Serverless (MySQL 호환, SSL 필수)
- S3 이미지: `lordhill-sns-media`
- S3 프론트: `lordhill-sns-front-905418091773-ap-northeast-2-an`
- 어드민: `https://admin.lordhill-sns.kr` (CloudFront: `d2yslh3s5p8hv0.cloudfront.net`)
- S3 어드민: `lordhill-sns-admin`
- CI/CD: GitHub Actions (`.github/workflows/deploy-server.yml`, `deploy-front.yml`, `deploy-admin.yml`)

## CI/CD 파이프라인

```
서버 (packages/server/** 변경 시):
  lint → prettier → Fly.io 배포 (fly deploy) → DB 마이그레이션 자동 실행

프론트 (packages/app-front/** 변경 시):
  lint → prettier → type-check → 빌드 (VITE_API_URL=https://api.lordhill-sns.kr) → S3 업로드 → CloudFront 캐시 무효화

어드민 (packages/admin-front/** 변경 시):
  빌드 (VITE_API_URL=https://api.lordhill-sns.kr) → S3 업로드 → CloudFront 캐시 무효화
```

## OAuth 인증 흐름

```
프론트: Google 버튼 클릭 → API_BASE_URL + /api/auth/google 리다이렉트
서버: Passport Google 전략 → 유저 생성/조회 → JWT 발급
서버: 쿠키 설정 + /auth/callback?token=xxx 리다이렉트
프론트: OAuthCallbackPage에서 토큰을 localStorage에 저장 → /auth/me 호출 → 홈 이동
```

주의: 프론트 useAuth는 localStorage 토큰이 있을 때만 /auth/me 호출. 없으면 호출 안 함 (무한 루프 방지).

## 프론트 API 연결

- 로컬: Vite 프록시 (`/api` → `localhost:3001`), VITE_API_URL 미설정
- 라이브: `VITE_API_URL=https://api.lordhill-sns.kr`, axiosInstance baseURL이 환경변수 사용
- OAuth 리다이렉트: `API_BASE_URL` (config/define.ts) + `/api/auth/google`

## 인프라 구성 (Fly.io + TiDB + AWS S3/CloudFront)

```
사용자 (iOS/Android WebView)
  ↓
CloudFront (HTTPS + CDN) → S3 (프론트 빌드 파일)
  ↓ API 호출
Fly.io (Docker 컨테이너, Express) → TiDB Cloud Serverless (MySQL 호환, SSL)
                                   → AWS S3 (이미지)
```

- Fly.io: SSL 자동 발급, Docker 배포, nginx/certbot/PM2 불필요
- TiDB Cloud Serverless: MySQL 호환, 5GB 무료, SSL 필수
- CloudFront: OAC로 S3 접근, SPA 에러 페이지(403→index.html), 커스텀 도메인 + ACM 인증서

## 도메인 설정 (가비아)

- `lordhill-sns.kr` → www로 포워딩
- `www` CNAME → `d3r7fh2kgsbnqt.cloudfront.net.`
- `api` CNAME → Fly.io 앱 도메인
- ACM 인증서 검증용 CNAME 레코드

## 보류 과제

- [ ] **로그인 후 뒤로가기 시 로그인 화면으로 이동** — OAuth 로그인 흐름에서 서버가 `/auth/callback?token=xxx`로 리다이렉트할 때 브라우저 히스토리에 로그인 페이지가 남음. OAuthCallbackPage에서 `navigate('/feed', { replace: true })`로 수정했으나, 네이티브 WebView에서 브라우저 히스토리 스택이 완전히 제거되지 않을 수 있음. 네이티브 측에서 로그인 완료 후 히스토리 클리어가 필요할 수 있음

## 시행착오 & 핵심 교훈

1. **S3 버킷 네임스페이스**: 계정 리전 네임스페이스 선택 시 이름이 길어짐. `aws s3 ls`로 실제 이름 확인 필수
2. **CloudFront AccessDenied**: OAC 사용 시 S3 버킷 정책에 CloudFront 서비스 프린시펄 허용 필수
3. **SPA 라우팅**: CloudFront에서 403 에러 → /index.html (200) 설정 필수 (React Router)
4. **Mixed Content**: 프론트가 HTTPS면 API도 HTTPS 필수. EC2에 nginx + certbot으로 SSL 설정
5. **Google OAuth redirect_uri_mismatch**: HTTP/HTTPS, 포트 유무, 도메인이 정확히 일치해야 함
6. **OAuth 콜백 데이터 구조**: 서버가 `res.json(user)`로 직접 반환 → 프론트에서 `res.data` (res.data.user 아님)
7. **useAuth 무한 루프**: 토큰 없이 /auth/me 호출 → 401 → 리프레시 → 실패 → 리다이렉트 → 무한반복. localStorage 토큰 있을 때만 호출
8. **PM2 포트 충돌**: 배포 시 기존 프로세스 정리 안 되면 EADDRINUSE. `pm2 delete all` 후 재시작
9. **RDS 테이블 없음**: EC2에서 `npx sequelize-cli db:migrate` 실행 필요. CI/CD에 마이그레이션 단계 추가
10. **EC2에서 RDS 접속 안 됨**: RDS 보안 그룹에 EC2 보안 그룹 허용 필요
11. **IP 주소 OAuth 불가**: Google은 IP를 리디렉션 URI로 허용 안 함. 도메인 필수
12. **Express `use('/')` 순서**: prefix `/`는 모든 경로에 매칭. 인증 미들웨어 붙은 `use('/')`는 반드시 다른 라우터보다 마지막에 배치
13. **CI/CD 시더 누락**: `db:migrate`만 있고 `db:seed:all`이 없으면 라이브에 초기 데이터 없음. 시더는 중복 실행 방지 로직(SELECT 후 스킵) 필수
14. **PM2 프로세스 중복**: `pm2 startOrRestart`가 구 프로세스를 교체 못하고 중복 생성 가능. 라이브 배포 후 문제 시 `pm2 list`로 프로세스 개수 확인, `pm2 delete all` 후 재시작
15. **다른 프로젝트 dev 서버와 포트 충돌**: `EADDRINUSE 0.0.0.0:3001`은 도커 문제가 아님. `ivf` 등 다른 프로젝트도 3001을 쓰므로 백그라운드에 떠 있으면 충돌. `connected {...}` 로그가 먼저 찍혔다면 DB는 정상이니 포트만 확인하면 된다. `lsof -nP -iTCP:3001 -sTCP:LISTEN`으로 점유 프로세스 확인 후 종료
16. **구조가 같은 두 테이블은 서로를 막지 못함**: `transactions`(일반헌금)와 `fund_transactions`(울타리기금)는 필드가 완전히 동일하고 카테고리·거래처 마스터도 공유한다. 그래서 일반헌금 CSV를 울타리기금 화면에 올려도 DB가 걸러내지 못했다(2026-09 실제 발생, 68건 오적재). CSV 내부 잔액 검증만으로는 못 잡는다 — 은행 파일은 자기들끼리는 항상 정합하기 때문. **대상 계좌의 직전 잔액과 이어지는지**를 봐야 한다 (`src/balance/balanceService.js`)

## 단위개발 완료 후 기록 규칙

이 프로젝트는 프로토타입이며, `~/.claude/docs/project-setup-guide.md`를 활용해 향후 여러 프로젝트를 세팅할 예정이다.
따라서 **매 단위개발이 끝나면 반드시** 아래 두 곳에 핵심 내용을 기록한다.

### 1. `CLAUDE.md` — 시행착오 & 핵심 교훈 섹션 업데이트
- 개발 중 겪은 **삽질, 버그, 예상과 다른 동작** 등을 간결하게 추가
- 이미 있는 항목과 중복되지 않도록 확인 후 추가

### 2. `~/.claude/docs/project-setup-guide.md` — 세팅 가이드 업데이트
- 새로운 기능/인프라가 추가되면 해당 **단계(절차 + 코드 스니펫)** 를 가이드에 추가
- 기존 단계의 절차가 변경되면 해당 섹션을 **수정**
- 각 단계에 포함할 내용:
  - **절차**: 명령어, 설정, 코드 순서
  - **시행착오**: 실제로 겪은 문제와 해결법 (`### ⚠️ 시행착오` 형식)
  - **핵심 포인트**: 다음 프로젝트에서 반드시 기억할 사항
- 목적: 이 가이드만 보고 새 프로젝트를 처음부터 끝까지 세팅할 수 있어야 함

### 기록 타이밍
- 단위개발 워크플로우의 **4. 검증** 단계 완료 후
- 일반 작업의 경우 기능 구현 완료 및 동작 확인 후
- 개발자가 "기록해" 또는 "문서 업데이트해"라고 요청할 때

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

## 배포 가이드

상세 절차: `~/.claude/docs/project-setup-guide.md` (6-1. Fly.io + TiDB 섹션)

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
