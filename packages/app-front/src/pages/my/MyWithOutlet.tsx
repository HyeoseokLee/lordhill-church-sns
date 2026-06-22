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
        <MyPage />
      </div>
      <BottomNavigation />
      {showOverlay && (
        <div
          className="fixed inset-0 z-[1200] flex justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="w-full max-w-[480px] h-full"
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#FFFFFF',
              animation: skipAnimation
                ? 'none'
                : `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out forwards`,
            }}
          >
            {displayOutlet}
          </div>
        </div>
      )}
    </>
  );
}
