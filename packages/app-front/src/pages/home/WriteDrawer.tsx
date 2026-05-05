import { Drawer } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

// 글쓰기 드로어 (우측 슬라이드)
export default function WriteDrawer() {
  const user = useAuthStore(s => s.user);
  const isOpen = useUIStore(s => s.isWriteDrawerOpen);
  const setOpen = useUIStore(s => s.setWriteDrawerOpen);

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => setOpen(false)}
      slotProps={{
        paper: { sx: { width: '100%', maxWidth: 480, bgcolor: '#FFFFFF' } },
      }}
    >
      <div className="flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h2 className="text-[17px] font-bold text-text">새 게시글</h2>
          <button className="px-4 py-2 bg-accent text-white font-bold text-[14px] rounded-[12px] hover:bg-accent-dark transition-colors duration-150 active:scale-[0.98]">
            게시
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 px-5 pt-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center">
              <span className="material-symbols-outlined text-text-muted text-[20px]">
                person
              </span>
            </div>
            <span className="text-[14px] font-bold text-text">
              {user?.name || '사용자'}
            </span>
          </div>
          <textarea
            className="w-full h-48 bg-transparent text-[15px] text-text placeholder-text-muted resize-none outline-none"
            placeholder="무슨 생각을 하고 계신가요?"
          />
          {/* 이미지 첨부 버튼 */}
          <div className="flex gap-2 mt-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface rounded-[12px] text-text-muted text-[13px] font-semibold hover:bg-surface-strong transition-colors duration-150">
              <span className="material-symbols-outlined text-[20px]">
                image
              </span>
              사진
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
