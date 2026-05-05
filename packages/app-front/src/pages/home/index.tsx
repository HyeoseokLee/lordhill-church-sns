import { useUIStore } from '@/stores/uiStore';
import FullHeightBox from '@/components/common/FullHeightBox';
import WriteDrawer from './WriteDrawer';

// 홈 피드 페이지
export default function HomePage() {
  const setWriteDrawerOpen = useUIStore((s) => s.setWriteDrawerOpen);

  return (
    <FullHeightBox style={{ height: '100%' }}>
      {/* 상단 헤더 */}
      <header className="w-full flex items-center justify-between px-5 py-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">손안의 교회</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150">
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </button>
      </header>

      {/* 피드 스크롤 영역 */}
      <div className="scrollInner" style={{ padding: 0 }}>
        <div className="flex flex-col gap-4 px-5 pb-10">
          {/* 피드 비어있을 때 */}
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-surface-strong mb-4">
              forum
            </span>
            <p className="text-[15px] font-semibold text-text-muted mb-1">아직 게시글이 없습니다</p>
            <p className="text-[13px] text-text-muted">첫 번째 게시글을 작성해보세요!</p>
            <button
              onClick={() => setWriteDrawerOpen(true)}
              className="mt-6 px-6 py-3 bg-accent text-white font-bold text-[14px] rounded-[12px] hover:bg-accent-dark transition-colors duration-150 active:scale-[0.98]"
            >
              글쓰기
            </button>
          </div>
        </div>
      </div>

      <WriteDrawer />
    </FullHeightBox>
  );
}
