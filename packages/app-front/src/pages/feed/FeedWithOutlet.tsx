import useOutletTransition from '@/hooks/useOutletTransition';
import FeedPage from './index';
import BottomNavigation from '@/components/common/BottomNavigation';

// 피드 탭 WithOutlet 래퍼 (네이티브 푸시 트랜지션)
export default function FeedWithOutlet() {
  const {
    hasOutlet,
    displayOutlet,
    isExiting,
    isSettled,
    showOverlay,
    transitionMs,
  } = useOutletTransition();

  // 진입 중: 살짝 왼쪽 → settled 후: 몰래 원위치 (오버레이 뒤라 안 보임)
  // 퇴장 시: 이미 원위치라 흔들림 없음
  const parentShifted = hasOutlet && !isSettled;

  return (
    <>
      {/* 메인 콘텐츠 */}
      <div
        className="w-full"
        style={{
          transform: parentShifted ? 'translateX(-30%)' : 'translateX(0)',
          transition: isSettled
            ? 'none'
            : `transform ${transitionMs}ms ease-out`,
        }}
      >
        <FeedPage />
      </div>
      <BottomNavigation />
      {/* 자식 페이지 오버레이 */}
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
