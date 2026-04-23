# 필수 규칙

## 코드 검사

- 코드 작성/수정 후 반드시 실행:
  ```bash
  npm run format    # prettier --write
  npm run lint      # ESLint
  npm run type-check # tsc --noEmit
  ```
- 에러가 있으면 즉시 수정 후 재검사.

## 주석

- 새로운 코드(함수, 컴포넌트, 훅, 상수 블록 등) 위에 기능/역할을 설명하는 한 줄 주석을 달 것.
- 주석은 한국어로, 간결하게 작성 (예: `// 피드 목록 커서 기반 페이지네이션`).

## 공통 컴포넌트

- 위치: `src/components/atoms/`, `src/components/common/`
- 전역 공통 컴포넌트(ThemeProvider, MainLayout, BottomNavigation, FullHeightBox 등)를 직접 수정하지 말 것. 수정이 필요하면 먼저 영향 범위를 확인.

## 공통 함수/훅 우선 적용

- **새로 만들기 전에 먼저 검색**: `src/hooks/`, `src/util/`, `src/components/common/`
- API 호출: `src/hooks/api/`의 기존 SWR 훅을 우선 재사용
- 환경 감지(웹뷰/OS)는 기존 훅 사용 (예: `useIsWebView`)
- 전역 상태가 필요하면 `src/stores/`의 기존 store 우선 사용, 없을 때만 추가
- 중복 구현 금지 — 기존 구현이 부족하면 먼저 확장을 검토

## 페이지 레이아웃 (FullHeightBox + scrollInner)

- 페이지 루트는 **`FullHeightBox`** 사용 (`src/components/common/FullHeightBox.tsx`)
  - 내부가 `flex-column` + `items-start`이므로, 가로로 꽉 차야 할 자식은 `w-full` 명시
- 스크롤 영역은 **`<div className="scrollInner">`** 로 감싼다
  - `@utility scrollInner`가 `index.css`에 정의됨: `flex-grow:1; overflow-y:auto; padding: 0 20px 40px`
  - 패딩을 커스터마이즈해야 하면 `style={{ padding: 0 }}` 등으로 오버라이드
- 구조 예시:

```tsx
<FullHeightBox>
  <Header />
  <div className="scrollInner">{/* 스크롤 콘텐츠 */}</div>
  <BottomCTA />
</FullHeightBox>
```

## TypeScript

- API 응답 타입은 각 API 모듈 파일 내에 정의하거나 `src/types/`에 추가
- `strict: false` — 점진적 마이그레이션 중이므로 JSX/TSX 혼용 가능
