import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import useOutletTransition from '@/hooks/useOutletTransition';
import FeedPage from './index';
import BottomNavigation from '@/components/common/BottomNavigation';

// 피드 탭 WithOutlet 래퍼 (네이티브 푸시 트랜지션)
export default function FeedWithOutlet() {
  const navigate = useNavigate();
  const {
    hasOutlet,
    displayOutlet,
    isExiting,
    isEntering,
    isSettled,
    showOverlay,
    transitionMs,
  } = useOutletTransition();

  // 진입 중: 살짝 왼쪽 → settled 후: 몰래 원위치 (오버레이 뒤라 안 보임)
  // 퇴장 시: 이미 원위치라 흔들림 없음
  const parentShifted = hasOutlet && !isEntering && !isSettled;

  return (
    <>
      {/* 메인 콘텐츠 */}
      <div
        className="w-full flex-1 flex flex-col overflow-hidden"
        style={{
          transform: parentShifted ? 'translateX(-30%)' : 'translateX(0)',
          transition: isSettled
            ? 'none'
            : `transform ${transitionMs}ms ease-out`,
        }}
      >
        <FeedPage />
      </div>
      {/* 글쓰기 플로팅 버튼 (max-w-[480px] 컨테이너 내 우측 하단) */}
      {!hasOutlet && (
        <div className="fixed bottom-[70px] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 pointer-events-none">
          <button
            onClick={() => navigate('/feed/post')}
            className="absolute bottom-0 right-5 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent-dark transition-colors duration-150 active:scale-[0.95] pointer-events-auto"
          >
            <Plus size={28} strokeWidth={2} />
          </button>
        </div>
      )}
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
            transform: isEntering ? 'translateX(100%)' : undefined,
            animation: !isEntering
              ? `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out forwards`
              : undefined,
          }}
        >
          {displayOutlet}
        </div>
      )}
    </>
  );
}
