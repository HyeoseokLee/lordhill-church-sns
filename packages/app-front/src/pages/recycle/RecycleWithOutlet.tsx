import { useNavigate } from 'react-router-dom';
import { Recycle } from 'lucide-react';
import useOutletTransition from '@/hooks/useOutletTransition';
import RecyclePage from './index';
import BottomNavigation from '@/components/common/BottomNavigation';

// 돌고래 탭 WithOutlet 래퍼 (네이티브 푸시 트랜지션)
export default function RecycleWithOutlet() {
  const navigate = useNavigate();
  const {
    hasOutlet,
    displayOutlet,
    isExiting,

    isSettled,
    showOverlay,
    transitionMs,
    enterDelayMs,
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
            : `transform ${transitionMs}ms ease-out ${parentShifted ? enterDelayMs : 0}ms`,
        }}
      >
        <RecyclePage />
      </div>
      {/* 글쓰기 플로팅 버튼 (max-w-[480px] 컨테이너 내 우측 하단) */}
      {!hasOutlet && (
        <div className="fixed bottom-[70px] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 pointer-events-none">
          <button
            onClick={() => navigate('/recycle/post')}
            className="absolute bottom-0 right-5 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent-dark transition-colors duration-150 active:scale-[0.95] pointer-events-auto"
          >
            <Recycle size={26} strokeWidth={2} />
          </button>
        </div>
      )}
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

            transform: isExiting ? undefined : 'translateX(100%)',
            animation: `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out ${isExiting ? 0 : enterDelayMs}ms forwards`,
          }}
        >
          {displayOutlet}
        </div>
      )}
    </>
  );
}
