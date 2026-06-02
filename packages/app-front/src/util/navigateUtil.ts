import { NavigateFunction } from 'react-router-dom';

const NAV_DELAY_MS = 150;

// 페이지 이동 시 0.2초 딜레이 (네이티브 앱 느낌)
export const delayNavigate = (
  navigate: NavigateFunction,
  to: string | number,
) => {
  setTimeout(() => {
    if (typeof to === 'number') {
      navigate(to);
    } else {
      navigate(to);
    }
  }, NAV_DELAY_MS);
};
