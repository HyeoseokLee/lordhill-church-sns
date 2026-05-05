# Design System — 손안의 교회

## Product Context
- **What this is:** 교회 40명 성인 멤버용 비공개 SNS
- **Who it's for:** 한국 교회 멤버, 전 연령대
- **Space/industry:** 소규모 커뮤니티/교회 앱
- **Project type:** 모바일 웹뷰 앱 (iOS/Android WebView)

## Aesthetic Direction
- **Direction:** Cool Minimal
- **Decoration level:** Minimal — 장식 최소, 콘텐츠가 주인공
- **Mood:** 깨끗하고 모던한 캔버스. 여백이 충분하고, 콘텐츠(사진, 글)가 돋보이는 쿨한 미니멀.
- **No-Line Rule:** 선/보더 사용 금지. 구분은 배경색 차이와 여백으로만.

## Typography
- **All:** Pretendard Variable — 한국어 교회 앱이므로 단일 폰트 통일이 가장 깔끔
- **Scale:**
  - Display: 28px / 800 (앱 이름, 페이지 타이틀)
  - Title: 20px / 700 (게시글 제목, 섹션 헤더)
  - Body: 15px / 400 (본문 텍스트)
  - Caption: 13px / 600 (시간, 메타 정보)
  - Label: 11px / 700, uppercase, letter-spacing 0.05em (배지, 상태)
- **Loading:** CDN — `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`

## Color
- **Approach:** Restrained — 1 포인트 컬러 + 뉴트럴
- **Accent (Primary):** #40C057 — 밝은 그린. 버튼, 아이콘, FAB, 좋아요, 활성 상태에만 사용
- **Accent Light:** #EBFBEE — 연한 그린 배경 (알림, 배지, 호버)
- **Accent Dark:** #2F9E44 — 호버/프레스 상태
- **Background:** #FFFFFF (기본), #F8F9FA (대체/피드 배경)
- **Surface:** #F1F3F5 (카드, 입력필드 배경)
- **Surface Strong:** #E9ECEF (구분선 대용, 강한 구분)
- **Text:** #212529 (본문), #868E96 (보조/muted)
- **Semantic:** 성공 #2F9E44, 에러 #E03131, 정보 #40C057
- **Dark mode:**
  - Background: #1A1A1A / #212121
  - Surface: #2A2A2A / #333333
  - Text: #E9ECEF / #868E96
  - Accent: #51CF66 (밝게 조정)
  - Accent Light: #1B3A1F

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Card-based feed (SNS 표준)
- **Max content width:** 480px (모바일 웹뷰 최적)
- **Grid:** Single column, full width cards
- **Border radius:** sm:6px, md:12px, lg:16px

## Motion
- **Approach:** Minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms)
- **원칙:** 전환과 상태 변화에만 사용. 장식적 애니메이션 없음.

## Do's and Don'ts

### Do:
- 여백 충분히 사용. 의심되면 더 넓히기
- 배경색 차이로 영역 구분 (white → #F8F9FA → #F1F3F5)
- 포인트 컬러(#40C057)는 절제해서 사용 — 희소할수록 눈에 띔
- 카드에 보더 없이 배경색만으로 분리

### Don't:
- 선/보더로 영역 구분하지 않기
- #000000 순수 검정 사용하지 않기 — #212529 사용
- 그래디언트 배경, 장식적 블러 효과 사용하지 않기
- 포인트 컬러를 넓은 영역에 사용하지 않기 (배경색 등)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-05 | 디자인 시스템 생성 | Cool Minimal + 밝은 그린 포인트. 리서치 기반. |
| 2026-05-05 | Pretendard 단일 폰트 | 한국어 교회 앱, 외국 폰트 혼용보다 통일이 깔끔 |
| 2026-05-05 | #40C057 포인트 컬러 | #4A7C59(칙칙) → #339AF0(블루) → #40C057(밝은 그린) 사용자 선택 |
| 2026-05-05 | No-Line Rule | 보더/구분선 없이 배경색 차이와 여백으로 구분 |
