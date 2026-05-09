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

MySQL + Sequelize 6. 6개 테이블: users, posts, post_media, likes, comments, admin_audit_logs.
Post/Comment는 `paranoid: true` (soft delete). 마이그레이션은 `packages/server/migrations/`.

- 로컬 Adminer: `http://localhost:8081` (서버: `mysql`, 사용자: `root`, 비밀번호: `rootpassword`)
- 라이브 Adminer: `http://localhost:8081` (서버: `lordhill-sns-db.c1qaum2qg2re.ap-northeast-2.rds.amazonaws.com`, 사용자: `admin`)

## Environment

서버 환경변수: `packages/server/.env`
- DB: localhost:3307, root/rootpassword, lordhill_sns
- S3: LocalStack `http://localhost:4566`
- Server port: 3001
- Google OAuth: Client ID/Secret은 .env에 설정

## Live (Production)

- 도메인: `lordhill-sns.kr` (가비아, 루트→www 포워딩)
- 프론트: `https://www.lordhill-sns.kr` (CloudFront: `d3r7fh2kgsbnqt.cloudfront.net`)
- API 서버: `https://api.lordhill-sns.kr` (EC2: `15.164.129.119`, nginx + certbot SSL)
- RDS: `lordhill-sns-db.c1qaum2qg2re.ap-northeast-2.rds.amazonaws.com` (admin)
- S3 이미지: `lordhill-sns-media`
- S3 프론트: `lordhill-sns-front-905418091773-ap-northeast-2-an`
- 어드민: `https://admin.lordhill-sns.kr` (CloudFront: `d2yslh3s5p8hv0.cloudfront.net`)
- S3 어드민: `lordhill-sns-admin`
- CI/CD: GitHub Actions (`.github/workflows/deploy-server.yml`, `deploy-front.yml`, `deploy-admin.yml`)
- EC2 SSH: `ssh -i lordhill-key.pem ec2-user@15.164.129.119`

## CI/CD 파이프라인

```
서버 (packages/server/** 변경 시):
  lint → prettier → EC2 배포 → DB 마이그레이션 → PM2 재시작

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

## AWS 인프라 구성

```
사용자 (iOS/Android WebView)
  ↓
CloudFront (HTTPS + CDN) → S3 (프론트 빌드 파일)
  ↓ API 호출
nginx (HTTPS, certbot) → EC2:3001 (Express) → RDS MySQL
                                              → S3 (이미지)
```

- EC2 보안 그룹: SSH(22), HTTP(80), HTTPS(443), 3001 개방
- RDS 보안 그룹: EC2 보안 그룹에서 3306 허용
- CloudFront: OAC로 S3 접근, SPA 에러 페이지(403→index.html), 커스텀 도메인 + ACM 인증서
- nginx: certbot SSL 자동 갱신, reverse proxy (443→3001)
- PM2: 서버 프로세스 관리, 재부팅 시 자동 시작

## 도메인 설정 (가비아)

- `lordhill-sns.kr` → www로 포워딩
- `www` CNAME → `d3r7fh2kgsbnqt.cloudfront.net.`
- `api` A → `15.164.129.119`
- ACM 인증서 검증용 CNAME 레코드

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

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

## 배포 가이드

상세 절차: `.claude/docs/aws-cicd-guide.md`

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
