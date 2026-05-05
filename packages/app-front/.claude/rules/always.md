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

## 페이지 중첩 라우트 (WithOutlet 오버레이 패턴)

리스트 → 상세 같은 계층 구조 페이지는 **WithOutlet 오버레이 패턴**을 사용한다. 부모 페이지가 항상 마운트된 상태에서 자식 페이지가 `position: fixed` 오버레이로 위에 덮이는 구조.

**장점**:
- 뒤로가기 시 부모 페이지가 리마운트되지 않아 스크롤 위치와 상태가 유지됨
- 자식 페이지가 닫힐 때(outlet이 null) 부모에서 refetch 등 후처리 가능

**파일 네이밍**: `{PageName}WithOutlet.tsx` — 같은 디렉토리에 `index.tsx`(실제 페이지)와 함께 배치

**기본 구조**:

```tsx
// src/pages/feed/FeedWithOutlet.tsx
import { useOutlet } from 'react-router-dom';
import FeedPage from './FeedPage';

export default function FeedWithOutlet() {
  const outlet = useOutlet();

  return (
    <>
      <FeedPage />
      {outlet && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            backgroundColor: '#FFFFFF',
          }}
        >
          {outlet}
        </div>
      )}
    </>
  );
}
```

**라우터 등록**:

```tsx
// router/Router.tsx
{
  path: '/feed',
  element: <FeedWithOutlet />,
  children: [
    { path: ':postId', element: <PostDetailPage /> },
  ],
}
```

**응용 — outlet 닫힐 때 refetch**:

```tsx
const outlet = useOutlet();
const prevOutletRef = useRef(outlet);

useEffect(() => {
  if (prevOutletRef.current && !outlet) {
    // 자식 페이지가 닫힘 → 리스트 refetch
    mutate();
  }
  prevOutletRef.current = outlet;
}, [outlet]);
```

**응용 — context 전달이 필요한 경우**:

```tsx
import { Outlet, useOutlet, useOutletContext } from 'react-router-dom';

const outlet = useOutlet();
const context = useOutletContext();

{outlet && (
  <div style={{ /* 오버레이 스타일 */ }}>
    <Outlet context={context} />
  </div>
)}
```

## 스타일링 (Tailwind 기본 + MUI 보조)

- **기본은 Tailwind CSS** — 레이아웃, 색상, 타이포그래피, 간격, 반응형 등 모든 스타일링
- **MUI는 복잡한 UI 컴포넌트에만 사용** — DatePicker, Dialog, Autocomplete 등 직접 구현이 비효율적인 경우
- **MUI의 단순 컴포넌트(Button, Typography, Box 등)는 사용하지 않음** — Tailwind로 대체
- **디자인 시스템**: `DESIGN.md` (프로젝트 루트) 기반, 컬러 토큰은 `index.css`의 `@theme`에 정의
- **폰트**: Pretendard 단일 폰트 (웨이트 차이로 구분)
- **포인트 컬러**: `--color-accent` (#40C057)

## 우선순위 (DESIGN.md vs always.md)

- **비주얼 (색상, 폰트, 간격, 보더, radius 등)** → `DESIGN.md` 우선
- **코드 구조 (레이아웃 패턴, 라우팅, 컴포넌트 구조, WithOutlet 등)** → `always.md` 우선

## TypeScript

- API 응답 타입은 각 API 모듈 파일 내에 정의하거나 `src/types/`에 추가
- `strict: false` — 점진적 마이그레이션 중이므로 JSX/TSX 혼용 가능
