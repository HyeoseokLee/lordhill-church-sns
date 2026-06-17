# Admin Design Guide

어드민 프론트엔드 UI/UX 컨벤션.

## 스타일링 원칙

- **레이아웃/색상/간격**: Tailwind CSS
- **복잡한 UI 컴포넌트**: MUI v9 (Dialog, Select 등)
- **MUI 단순 컴포넌트(Button, Typography, Box 등)**: 사용하지 않음, Tailwind로 대체

## 입력 컴포넌트

- **텍스트 입력**: `@mui/material/TextField` 사용 (native `<input>` 사용 금지)
  - 기본 props: `size="small"`, `variant="outlined"`
  - 라벨이 필요하면 `label` prop 활용
- **셀렉트**: `<select>` + Tailwind 또는 MUI Select (상황에 따라)
- **버튼**: Tailwind 기반 `<button>` (MUI Button 사용하지 않음, DialogActions 내부 제외)

## 테이블

- 컨테이너: `bg-white rounded-lg shadow-sm overflow-hidden`
- 헤더: `bg-gray-50 border-b`, 셀 `px-4 py-3 font-medium text-gray-500`
- 행: `border-b last:border-0 hover:bg-gray-50`

## 다이얼로그 (MUI Dialog)

- 확인/삭제: `ConfirmModal.jsx` 공용 컴포넌트
- 폼 다이얼로그: MUI Dialog + DialogTitle + DialogContent
- 긴 콘텐츠: `scroll="body"` prop

## 버튼 색상

- 주요 액션: `bg-blue-600 hover:bg-blue-700 text-white`
- 보조 액션: `bg-gray-900 hover:bg-gray-800 text-white`
- 위험 액션: `bg-red-600 hover:bg-red-700 text-white`
- 텍스트 버튼: `text-blue-600 hover:bg-blue-50` / `text-red-600 hover:bg-red-50`

## 상태 뱃지

- `inline-block px-2 py-1 rounded-full text-xs font-medium`
- 성공/활성: `bg-green-100 text-green-800`
- 경고/대기: `bg-yellow-100 text-yellow-800`
- 에러/위험: `bg-red-100 text-red-800`
- 정보: `bg-blue-100 text-blue-800`
