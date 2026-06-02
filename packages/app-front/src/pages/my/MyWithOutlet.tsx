import useOutletTransition from '@/hooks/useOutletTransition';
import MyPage from './index';
import BottomNavigation from '@/components/common/BottomNavigation';

// 마이페이지 탭 WithOutlet 래퍼 (네이티브 푸시 트랜지션)
export default function MyWithOutlet() {
  const {
    hasOutlet,
    displayOutlet,
    isExiting,
    isSettled,
    showOverlay,
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
        <MyPage />
      </div>
      <BottomNavigation />
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            backgroundColor: '#FFFFFF',
            animation: `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out forwards`,
          }}
        >
          {displayOutlet}
        </div>
      )}
    </>
  );
}
