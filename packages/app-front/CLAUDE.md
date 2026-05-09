# app-front

교회 40명 멤버용 비공개 SNS 프론트엔드. 모바일 웹뷰 우선 설계.

## 명령어

```bash
npm run dev          # Vite 개발 서버 (port 5173), /api → localhost:3001 프록시
npm run build        # tsc --noEmit + vite build → ./dist
npm run type-check   # TypeScript 타입 체크만
npm run lint         # ESLint (flat config, TS + React)
npm run prettier     # Prettier 체크
npm run format       # Prettier 자동 수정
```

서버가 port 3001에서 실행 중이어야 함 (모노레포 루트에서 `npm run dev:server`).

## 스택

React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + MUI v9(Drawer 등 복잡 컴포넌트만) + Zustand + SWR + React Router v7 + Axios + Lucide React

**경로 alias**: `@/` → `src/` (vite.config.js + tsconfig.json)

## 아키텍처

### 앱 부트스트랩
`main.tsx` → `App.tsx` (ThemeProvider + useAuth + Router)

### 인증 흐름
1. `useAuth` 훅: 마운트 시 localStorage에 accessToken이 있으면 `/auth/me` 호출 → authStore 채움. 토큰 없으면 호출 안 함 (무한 루프 방지)
2. OAuth: `API_BASE_URL + /api/auth/google` 리다이렉트 → 서버 처리 → `/auth/callback?token=xxx` 리다이렉트 → OAuthCallbackPage에서 토큰을 localStorage에 저장 → `/auth/me` → 홈 이동
3. Dev Login: `POST /api/auth/dev-login` → 토큰을 localStorage에 저장
4. `MainLayout`에서 인증 가드 (미인증 → /login, PENDING → /login/pending)

### API 레이어
- `api/axiosInstance.ts`: Bearer 토큰 주입 + 401 자동 리프레시(큐 패턴) + withCredentials
- 로컬: Vite 프록시 `/api` → `localhost:3001` (VITE_API_URL 미설정)
- 라이브: `VITE_API_URL=https://api.lordhill-sns.kr` → baseURL이 환경변수 사용
- OAuth 리다이렉트: `API_BASE_URL` (config/define.ts) 사용 — 로컬은 빈 문자열, 라이브는 VITE_API_URL

### 상태 관리
- **Zustand**: authStore (유저, 인증 상태), uiStore (BottomNav 표시, WriteDrawer 열림)
- **SWR**: 서버 상태 (hooks/api/) — fetcher가 axiosInstance 사용

### 라우팅
`router/Router.tsx`에서 `createBrowserRouter` 사용.
- 공개: `/login`, `/login/pending`, `/auth/callback`
- 인증 (MainLayout 하위): `/` (홈), `/feed`, `/posts/:postId`, `/posts/new`, `/profile`, `/profile/:userId`
- MainLayout: FullHeightBox + scrollInner (스크롤 영역 관리) + BottomNavigation + WriteDrawer

### 주요 컴포넌트 구조
- `MainLayout`: FullHeightBox + scrollInner + BottomNav + WriteDrawer → 하위 페이지는 패딩/스크롤 불필요
- `BottomNavigation`: Lucide 아이콘 (홈/글쓰기/프로필), 텍스트 없음. 글쓰기는 Drawer 오픈
- `WriteDrawer`: MUI Drawer 우측 슬라이드, MainLayout에서 렌더링. 게시 완료 시 홈으로 이동

## 스타일링

- **Tailwind CSS 기본**, MUI는 Drawer 등 복잡 컴포넌트만
- 디자인 시스템: `DESIGN.md` (프로젝트 루트) — Cool Minimal, #40C057 포인트
- 컬러 토큰: `index.css`의 `@theme` (accent, bg, surface, text 등)
- 폰트: Pretendard 단일
- 아이콘: Lucide React (Material Symbols에서 전환)
- Prettier: printWidth 80, arrowParens avoid, singleQuote (healthcare 참조)
- ESLint: flat config, .d.ts 제외, no-undef off

## 컨벤션

- TypeScript `strict: false` (점진적 마이그레이션)
- SWR 훅: `hooks/api/`에 추가, 네이밍 `use{Resource}`
- 상수: `config/define.ts` (API_BASE_URL 포함)
- MUI 타입 확장: `types/mui.d.ts`
- 참고 프로젝트: `~/Documents/cheeze/healthcare/healthcare-front`
