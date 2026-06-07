import useOutletTransition from '@/hooks/useOutletTransition';
import NotificationsPage from './index';

// 알림 페이지 WithOutlet 래퍼 (알림→상세 슬라이드 트랜지션)
export default function NotificationsWithOutlet() {
  const {
    hasOutlet,
    displayOutlet,
    isExiting,
    isSettled,
    showOverlay,
    skipAnimation,
    transitionMs,
  } = useOutletTransition();

  const parentShifted = hasOutlet && !isSettled;

  return (
    <>
      <div
        className="w-full flex-1 flex flex-col overflow-hidden"
        style={{
          transform: parentShifted ? 'translateX(-30%)' : 'translateX(0)',
          transition: isSettled
            ? 'none'
            : `transform ${transitionMs}ms ease-out`,
        }}
      >
        <NotificationsPage />
      </div>
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            backgroundColor: '#FFFFFF',
            animation: skipAnimation
              ? 'none'
              : `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out forwards`,
          }}
        >
          {displayOutlet}
        </div>
      )}
    </>
  );
}
