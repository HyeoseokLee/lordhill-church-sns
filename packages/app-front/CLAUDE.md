# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
npm run dev          # Vite 개발 서버 (port 5173), /api → localhost:3001 프록시
npm run build        # tsc --noEmit + vite build → ./dist
npm run type-check   # TypeScript 타입 체크만
npm run lint         # ESLint (flat config, TS + React)
```

서버가 port 3001에서 실행 중이어야 함 (모노레포 루트에서 `npm run dev:server`).

## 아키텍처

교회 40명 멤버용 비공개 SNS의 프론트엔드. 모바일 웹뷰 우선 설계 (Capacitor 예정, 아직 미구현).

**스택**: React 19 + TypeScript + Vite 8 + MUI v9 + Tailwind CSS v4 + Zustand + SWR + React Router v7 + Axios

**경로 alias**: `@/` → `src/` (vite.config.js + tsconfig.json 양쪽에 설정)

### 앱 부트스트랩

`main.tsx` → `App.tsx` (ThemeProvider + Toaster + useAuth + Router)

`useAuth` 훅이 마운트 시 localStorage의 accessToken을 확인하고, `/auth/me`를 호출해서 authStore를 채움. 인증이 필요한 모든 라우트는 `MainLayout` 뒤에 있으며, 미인증 시 `/login`, 역할이 PENDING이면 `/login/pending`으로 리다이렉트.

### 상태 관리

- **Zustand**: 클라이언트 상태 (authStore, uiStore) — Recoil 아님
- **SWR**: 서버 상태 (hooks/api/ 디렉토리) — fetcher가 axiosInstance 사용

### API 레이어

`api/axiosInstance.ts`가 Bearer 토큰 주입과 401 자동 리프레시(큐 패턴)를 처리. 도메인별 API 모듈(authApi, postApi, commentApi, userApi, uploadApi)이 axiosInstance를 래핑.

Vite 프록시: `/api/*` → `http://127.0.0.1:3001/*` (rewrite 없이 그대로 전달).

### 인증 플로우

OAuth 프로바이더(Google/Kakao/Naver)가 `/api/auth/{provider}`로 리다이렉트 → 서버에서 OAuth 처리 → `/auth/callback?token=xxx`로 리다이렉트 → OAuthCallbackPage에서 토큰 저장 후 유저 정보 조회. 개발 환경에서는 `Dev Login` 버튼으로 `POST /api/auth/dev-login` 호출.

### 라우팅

`router/Router.tsx`에서 `createBrowserRouter` 사용. 공개 라우트: `/login`, `/login/pending`, `/auth/callback`. 인증 라우트는 `MainLayout` + `<Outlet>` 하위: 피드(`/`), 게시글 상세, 게시글 작성, 프로필.

### MUI 테마

`components/frame/ThemeProvider.tsx` — 교회 녹색 primary(#4A7C59), 커스텀 타이포그래피 variants(bold24~regular12, semibold, medium), Pretendard 폰트. healthcare-front 패턴을 따라 MuiTypography 컴포넌트 variants로 정의.

## 컨벤션

- TypeScript `strict: false` (점진적 마이그레이션, JSX/TSX 혼용 가능)
- SWR 훅은 `hooks/api/`에 추가 — 네이밍: `use{Resource}` (예: `useFeed`, `usePost`)
- 상수는 `config/define.ts`에 정의
- MUI 타입 확장은 `types/mui.d.ts`
- SVG는 @svgr/rollup으로 React 컴포넌트로 import 가능
- Prettier 설정 적용 (.prettierrc) — 싱글 쿼트, trailing comma
