<!-- /autoplan restore point: /Users/hyeonseoklee/.gstack/projects/HyeoseokLee-lordhill-church-sns/main-autoplan-restore-20260330-220531.md -->
# Lordhill Church SNS — Implementation Plan

## Overview

교회 성인 멤버 약 40명을 위한 비공개 SNS.
글, 사진, 동영상을 포스팅하고, 좋아요/댓글로 소통하는 심플한 커뮤니티 앱.

Design doc: ~/.gstack/projects/HyeoseokLee-lordhill-church-sns/hyeonseoklee-main-design-20260330-215627.md

## Target Users

- 로드힐 교회 성인 멤버 약 40명
- 비공개 커뮤니티 (가입 승인 필요)

## Core Features (MVP)

### 1. 인증 (Auth)
- 소셜 로그인: Google, Kakao, Naver (OAuth 2.0)
- 첫 로그인 시 관리자 승인 대기 상태
- JWT: Access Token 1시간, Refresh Token 30일
- 토큰 저장: httpOnly 쿠키 (SameSite=Strict)
- 최초 관리자: DB seed 스크립트로 지정

### 2. 프로필
- 닉네임 설정/수정
- 프로필 사진 업로드/변경
- 프로필 조회

### 3. 포스팅 (Feed)
- 텍스트, 사진, 동영상 포스팅 작성
- 사진: Sharp 리사이즈(1920px, JPEG 80%) → S3 업로드. Worker thread에서 처리 (이벤트 루프 차단 방지). 최대 10장.
- 동영상: S3 Presigned URL로 클라이언트 직접 업로드 (multipart). 최대 100MB.
- 피드: cursor 기반 페이지네이션 (created_at + id), 20개/페이지
- 포스트 수정: 텍스트만. 미디어 변경은 삭제 후 재작성.
- 포스트/댓글 삭제: soft delete (deleted_at)

### 4. 리액션
- 좋아요 (토글)
- 댓글 작성/삭제
- 댓글: offset 페이지네이션, 20개/페이지
- 좋아요 수, 댓글 수 표시

### 5. 관리자 (Admin)
- 회원 가입 승인/거절
- 회원 목록 관리 (상태별 필터)
- 포스트/댓글 강제 삭제 (soft delete)

## Tech Stack

### app-front (사용자 앱)
- React.js + Vite
- React Router
- Axios
- TailwindCSS
- Zustand

### admin-front (관리자 웹)
- React.js + Vite
- TailwindCSS
- 회원 승인, 컨텐츠 관리 대시보드

### server (API)
- Express.js
- DB: MySQL + Prisma ORM
- Auth: Passport.js (Google, Kakao, Naver OAuth)
- 파일 업로드: multer-s3 (사진), S3 Presigned URL (동영상)
- 이미지 리사이즈: Sharp
- JWT: jsonwebtoken
- Validation: Zod
- 보안: cors, express-rate-limit, helmet

### 모바일 앱
- Capacitor for Android + iOS
- 카메라 접근 네이티브 플러그인 포함
- 배포: Android APK/Play 내부트랙 + iOS TestFlight
- App Store 정식 배포는 stretch goal
- 푸시 알림: MVP 범위 밖 (향후 FCM)

## Architecture

```
[Capacitor Android/iOS] → [app-front (React + Vite)]
                                 ↓
                           [Express API Server]
                           (CORS, Rate Limit, Auth)
                                 ↓
                       [MySQL] + [AWS S3]

[admin-front (React + Vite)] → [Express API Server] (관리자 전용 엔드포인트)
```

## Database Schema (MySQL + Prisma)

### users
- id, email, nickname, profile_image_url
- provider (google/kakao/naver), provider_id
- role (member/admin), status (pending/approved/rejected/deactivated)
- created_at, updated_at

### posts
- id, author_id (FK users), content (text)
- created_at, updated_at, deleted_at (nullable, soft delete)

### post_media
- id, post_id (FK posts), media_type (image/video)
- url, order, created_at

### likes
- id, user_id (FK users), post_id (FK posts)
- created_at
- UNIQUE(user_id, post_id)

### comments
- id, post_id (FK posts), author_id (FK users)
- content, created_at, updated_at, deleted_at (nullable, soft delete)

## API Endpoints

### Auth
- GET /auth/google — Google OAuth 시작
- GET /auth/google/callback — Google OAuth 콜백
- GET /auth/kakao — Kakao OAuth 시작
- GET /auth/kakao/callback — Kakao OAuth 콜백
- GET /auth/naver — Naver OAuth 시작
- GET /auth/naver/callback — Naver OAuth 콜백
- POST /auth/refresh — JWT 리프레시
- POST /auth/logout — 로그아웃

### Users
- GET /users/me — 내 프로필
- PATCH /users/me — 프로필 수정 (닉네임, 사진)
- GET /users/:id — 다른 유저 프로필 조회

### Posts
- GET /posts — 피드 목록 (cursor 페이지네이션)
- POST /posts — 포스트 작성 (multipart/form-data)
- GET /posts/:id — 포스트 상세
- PATCH /posts/:id — 포스트 수정 (텍스트만)
- DELETE /posts/:id — 포스트 삭제 (soft delete)
- POST /posts/:id/upload-url — 동영상 Presigned URL 발급

### Likes
- POST /posts/:id/like — 좋아요 토글

### Comments
- GET /posts/:id/comments — 댓글 목록 (offset 페이지네이션)
- POST /posts/:id/comments — 댓글 작성
- DELETE /comments/:id — 댓글 삭제 (soft delete)

### Admin
- GET /admin/users — 회원 목록 (상태 필터)
- PATCH /admin/users/:id/approve — 회원 승인
- PATCH /admin/users/:id/reject — 회원 거절
- DELETE /admin/posts/:id — 포스트 강제 삭제 (soft delete)
- DELETE /admin/comments/:id — 댓글 강제 삭제 (soft delete)

## UI Specification

### Navigation (app-front)
- 하단 탭 바: 피드 (홈 아이콘) | 프로필 (사람 아이콘)
- 우측 상단: 로그아웃 버튼
- 피드 화면 우하단: FAB (플로팅 액션 버튼) → 포스트 작성

### Screen Inventory

**1. 로그인 화면**
- 앱 로고 + 교회 이름
- Google/Kakao/Naver 로그인 버튼 3개 (세로 배치)

**2. 승인 대기 화면**
- "가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요." 메시지
- 앱을 닫았다 다시 열면 자동으로 상태 확인 후 리다이렉트
- 거절 시: "가입이 거절되었습니다. 관리자에게 문의해주세요." + 로그아웃 버튼
- 승인 알림: 관리자가 카카오톡으로 직접 안내 (앱 내 알림은 MVP 밖)

**3. 피드 화면**
- 포스트 카드: 작성자 아바타(좌) + 닉네임 + 상대 시간("3분 전")
- 본문 텍스트 (최대 2000자, 5줄 초과 시 "더보기" 트렁케이션)
- 미디어: 1장=전체너비, 2장=나란히, 3장+=2x2 그리드 + "+N" 오버레이. 탭 시 전체화면 뷰어(스와이프).
- 동영상: 인라인 썸네일 + 재생 버튼. 탭하면 재생 (음소거 시작, 탭으로 음소거 해제).
- 리액션 바: ♡ 좋아요 수 | 💬 댓글 수
- Pull-to-refresh 지원
- 무한 스크롤: 하단 도달 시 로딩 스피너
- 빈 피드: "아직 게시물이 없습니다. 첫 번째 글을 작성해보세요!" + 작성 버튼

**4. 포스트 작성 화면**
- 텍스트 입력 (최대 2000자, 카운터 표시)
- 사진 추가 버튼 (갤러리에서 선택, 최대 10장)
- 동영상 추가 버튼 (갤러리에서 선택, 최대 1개 100MB)
- 사진+동영상 동시 불가 (하나만 선택)
- 텍스트 없이 미디어만 가능
- 업로드 진행률 표시 (프로그레스 바 + 퍼센트)
- 뒤로가기 시: "작성 중인 내용이 사라집니다. 나가시겠습니까?" 확인 다이얼로그
- 하단 "게시" 버튼

**5. 포스트 상세 화면**
- 포스트 전체 내용 + 댓글 목록
- 본인 작성 포스트: 수정(텍스트만)/삭제 메뉴
- 삭제 시: "정말 삭제하시겠습니까?" 확인 다이얼로그
- 댓글 입력 바 (하단 고정)

**6. 프로필 화면**
- 프로필 사진 + 닉네임 + 가입일
- 내가 작성한 포스트 목록
- 프로필 편집 버튼 (본인만)
- 빈 프로필: "아직 작성한 게시물이 없습니다."

**7. 프로필 편집 화면**
- 프로필 사진 변경 (카메라/갤러리)
- 닉네임 변경 (2-20자, 한글/영문/숫자, 고유값)
- 저장 버튼

### Admin-front Screens

**1. 대시보드**
- 좌측 사이드바: 회원 관리 | 컨텐츠 관리
- 대시보드 메인: 총 회원 수, 대기 중 회원 수, 오늘 포스트 수

**2. 회원 관리**
- 테이블: 닉네임 | 이메일 | OAuth 제공자 | 상태 | 가입일 | 액션
- 상태 필터 탭: 전체 | 대기 | 승인됨 | 거절됨
- 액션: 승인/거절 버튼. 클릭 시 확인 다이얼로그.

**3. 컨텐츠 관리**
- 포스트 테이블: 작성자 | 내용 미리보기 | 미디어 수 | 좋아요/댓글 수 | 작성일 | 삭제
- 삭제 클릭 시: "정말 삭제하시겠습니까?" 확인 다이얼로그 + 성공 토스트

### UI States

| 상태 | 표시 방식 |
|---|---|
| 로딩 (초기) | 스켈레톤 UI (피드 카드 형태) |
| 로딩 (추가) | 하단 스피너 |
| 빈 상태 | 일러스트 + 안내 메시지 |
| 에러 | 토스트 메시지 (3초 후 자동 닫힘) |
| 성공 | 토스트 메시지 (2초) |
| 오프라인 | 상단 배너 "인터넷 연결을 확인해주세요" (재연결 시 자동 숨김) |
| 삭제 확인 | 모달 다이얼로그 |

### Deactivated User Display
- 아바타: 기본 회색 아이콘
- 닉네임: "탈퇴한 사용자"
- 프로필 링크: 비활성 (탭 불가)
- 기존 포스트/댓글: 표시 유지, 작성자 익명화

### Capacitor OAuth Flow
- `@capacitor/browser` 플러그인으로 시스템 브라우저에서 OAuth 진행
- 커스텀 URL scheme: `lordhill://auth/callback`
- OAuth 콜백 → 서버에서 단기 일회용 auth code 발급 → 커스텀 URL로 리다이렉트 (code만 전달, 토큰 아님)
- 앱에서 auth code를 서버에 POST → 서버가 JWT 발급 → 앱이 `@capacitor/preferences`에 저장
- 모바일 앱: Bearer 토큰 헤더 방식 (쿠키 불안정). 웹 admin-front: httpOnly 쿠키 방식.
- 서버는 두 방식 모두 지원: Authorization 헤더 우선, 없으면 쿠키 확인

### Content Rules
- 포스트 본문: 최대 2000자
- 댓글: 최대 500자
- 닉네임: 2-20자, 한글/영문/숫자/밑줄, 고유값
- 포스트 조합: 텍스트만 / 텍스트+사진 / 텍스트+동영상 / 사진만 / 동영상만 (사진+동영상 동시 불가)
- 동영상 포맷: mp4, mov 허용. 서버에서 MIME 타입 검증.
- 동영상 썸네일: MVP에서는 기본 placeholder 이미지 사용. ffmpeg 썸네일 생성은 post-MVP (복잡도 높음).
- 동영상 업로드 확인: 클라이언트가 S3 업로드 완료 후 POST /posts/:id/media/confirm 호출. 서버가 S3 HeadObject로 존재 확인. 미확인 미디어는 24시간 후 정리 (cron).
- Presigned URL 조건: Content-Type video/mp4 or video/quicktime, Content-Length max 100MB

## Server Middleware

- CORS: app-front, admin-front 도메인만 허용
- Rate Limiting: /auth 15분당 10회, /upload 1분당 5회
- CSRF: SameSite=Lax 쿠키 (OAuth 콜백 호환) + CSRF 토큰 (POST/PATCH/DELETE)
- Auth: JWT 검증 미들웨어 (Bearer 헤더 우선, 쿠키 폴백)
- Validation: Zod 스키마
- XSS 방지: 서버에서 HTML entity escape (모든 사용자 입력 텍스트). 클라이언트에서 dangerouslySetInnerHTML 금지.
- Admin audit log: admin_audit_log 테이블 (admin_user_id, action, target, metadata, created_at)
- Post/Comment 생성 Rate Limit: POST /posts 10/분, POST /comments 30/분

## Error Handling

- OAuth 실패: "로그인에 실패했습니다" + 로그인 화면 복귀
- S3 업로드 실패: 최대 2회 재시도 후 에러 메시지
- DB 연결 실패: 503 + "서비스 점검 중"
- JWT 만료: 자동 refresh. refresh도 만료 시 로그인 리다이렉트

## Deletion Policy

- 포스트/댓글: soft delete (deleted_at 타임스탬프)
- 사용자 탈퇴: status=deactivated, 콘텐츠 유지 (닉네임 "탈퇴한 사용자")
- 사용자 비활성화 시: auth 미들웨어에서 매 요청마다 user status 확인. deactivated면 401 반환.
- 관리자 강제 삭제: soft delete

## Backup

- MySQL: 일일 mysqldump → S3 저장 (cron)
- S3: 버저닝 활성화

## OAuth Provider Notes

- Google: 가장 간단. 먼저 구현.
- Kakao: 비즈앱 전환 필요 (프로덕션). 승인 1-2주 소요.
- Naver: 실명 인증 필요. 승인 1-2주 소요. 마지막에 추가.

## Implementation Phases

### Phase 1: Foundation
1. 모노레포 구조 세팅 (npm workspaces: app-front, admin-front, server)
2. docker-compose.yml (MySQL + LocalStack S3)
3. Express 서버 기본 구조 + Prisma + MySQL 연결
4. OAuth 인증 (Google 먼저)
5. JWT 미들웨어 + 쿠키 설정

### Phase 2: Core Features
6. 유저 프로필 CRUD
7. 포스트 CRUD + 사진 업로드 (multer-s3 + Sharp)
8. 동영상 업로드 (Presigned URL)
9. 좋아요, 댓글 기능
10. 피드 cursor 페이지네이션

### Phase 3: App Frontend
11. app-front 라우팅 + 레이아웃
12. 로그인/회원가입 플로우
13. 피드, 포스트 작성, 프로필 화면

### Phase 4: Admin
14. admin-front 대시보드
15. 회원 승인/관리
16. 컨텐츠 관리

### Phase 5: Mobile + Remaining OAuth
17. Capacitor Android/iOS 앱
18. Kakao OAuth 추가
19. Naver OAuth 추가

## Test Plan

### Unit Tests
- Prisma 모델: CRUD, soft delete 필터링, unique constraint
- JWT: 발급, 검증, 만료, refresh
- Zod 스키마: 각 엔드포인트 입력 검증

### Integration Tests
- OAuth 콜백: 각 제공자 mocked 응답 (신규/기존/거절/비활성 사용자)
- 파일 업로드: 사진 리사이즈 + S3 업로드 (LocalStack)
- Presigned URL: 발급 → 업로드 → confirm
- 좋아요 토글: 동시 요청 race condition
- 페이지네이션: cursor/offset 경계값

### E2E Tests (수동 체크리스트)
- Capacitor OAuth 플로우 (Android/iOS 물리 디바이스)
- 카메라/갤러리 접근
- Deep link 처리 (lordhill://auth/callback)
- 오프라인 → 온라인 복귀 시 동작

### 도구
- Jest + Supertest (API 테스트)
- React Testing Library (프론트엔드)
- LocalStack (S3 mock)

## Cost Estimate (Monthly)

| 항목 | 예상 비용 |
|---|---|
| MySQL (RDS t4g.micro or 자체 호스팅) | $0-15 |
| S3 (40명, 월 ~5GB 업로드) | $1-2 |
| EC2 (t4g.small) or Railway/Render | $5-20 |
| 도메인 | $1-2 |
| **합계** | **$7-39/월** |

40명 규모에서 월 $40 이하로 운영 가능.

## Non-Goals (MVP 범위 밖)
- 실시간 채팅
- 푸시 알림
- 검색 기능
- 해시태그
- DM (다이렉트 메시지)
- 스토리 기능
- App Store 정식 배포

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | 네이버밴드 대안 우려 수용 불필요 | Mechanical | P6 (action) | 사용자가 office-hours에서 "직접 만든다" 확인 | 전략 재검토 |
| 2 | CEO | 교회 특화 기능 추가 불필요 | Mechanical | P3 (pragmatic) | "간단하게 시작" 사용자 의도 | 스코프 확장 |
| 3 | CEO | 채택 리스크 surface at gate | Taste | — | 연습이지만 유효한 우려 | — |
| 4 | CEO | 유지보수 부담 surface at gate | Taste | — | 1인 개발 + 4패키지 | — |
| 5 | CEO | 테스트 계획 추가 | Mechanical | P1 | Plan에 테스트 전략 부재 | — |
| 6 | CEO | AWS 비용 추정 추가 | Mechanical | P1 | 월 비용 미언급 | — |
| 7 | Design | UI 스펙 전체 추가 | Mechanical | P1+P5 | 화면/상태/네비 누락 | — |
| 8 | Design | 승인대기/거절 화면 정의 | Mechanical | P1 | 핵심 화면 누락 | — |
| 9 | Design | Capacitor OAuth 플로우 정의 | Mechanical | P5 | 기술적 트랩 사전 정의 | — |
| 10 | Design | 다중이미지/동영상 표시 정의 | Mechanical | P5 | UX 결정 누락 | — |
| 11 | Design | 오프라인 처리 surface at gate | Taste | — | MVP 범위 경계 | — |
| 12 | Eng | Auth code 교환 방식 전환 | Mechanical | P5 | URL 토큰 노출 보안 위험 | URL 파라미터 |
| 13 | Eng | Capacitor Bearer 토큰 사용 | Mechanical | P5 | WebView 쿠키 불안정 | 쿠키 전용 |
| 14 | Eng | Sharp worker thread 처리 | Mechanical | P3 | 이벤트 루프 차단 방지 | 동기 처리 |
| 15 | Eng | ffmpeg 썸네일 → MVP placeholder | Mechanical | P3 | 복잡도 대비 가치 낮음 | ffmpeg |
| 16 | Eng | Presigned URL confirm 단계 추가 | Mechanical | P1 | 고아 S3 객체 방지 | — |
| 17 | Eng | SameSite Strict → Lax | Mechanical | P5 | Strict가 OAuth 콜백 차단 | Strict |
| 18 | Eng | XSS 방지 + audit log 추가 | Mechanical | P1 | 보안 기본 요소 | — |
| 19 | Eng | 비활성 사용자 JWT 무효화 | Mechanical | P1 | 탈퇴 후 접근 가능 구멍 | — |
