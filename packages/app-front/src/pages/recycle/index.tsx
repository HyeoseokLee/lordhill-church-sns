import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, LayoutGrid, MessageSquare, User } from 'lucide-react';
import { useRecycles } from '@/hooks/api/useRecycles';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/util/dateUtil';

// 돌고래(재활용/나눔) 메인 페이지
export default function RecyclePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const { items, hasMore, isLoading, isLoadingMore, loadMore, mutate } =
    useRecycles();
  const observerRef = useRef<HTMLDivElement>(null);

  // 자식 페이지에서 새로고침 신호
  useEffect(() => {
    const handler = () => mutate();
    window.addEventListener('recycle-refresh', handler);
    return () => window.removeEventListener('recycle-refresh', handler);
  }, [mutate]);

  // 무한스크롤
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore],
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // 첫 번째 이미지 URL
  const getThumb = (item: any) => item.media?.[0]?.url || '';

  return (
    <>
      {/* 상단 헤더 (고정) */}
      <header className="w-full flex items-center justify-between py-4 px-5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          돌고래
        </h1>
        <button
          onClick={() => setViewMode(v => (v === 'list' ? 'card' : 'list'))}
          className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
        >
          {viewMode === 'list' ? (
            <LayoutGrid size={20} strokeWidth={1.5} />
          ) : (
            <List size={20} strokeWidth={1.5} />
          )}
        </button>
      </header>

      {/* 스크롤 영역 */}
      <div className="scrollInner">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-text-muted">불러오는 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[15px] font-semibold text-text-muted mb-1">
              아직 나눔 글이 없습니다
            </p>
            <p className="text-[13px] text-text-muted">
              공유하고 싶은 물품을 등록해보세요!
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* 리스트 뷰 */
          <div className="flex flex-col">
            {items.map((item: any) => (
              <button
                key={item.id}
                onClick={() => navigate(`/recycle/detail/${item.id}`)}
                className="w-full flex gap-3 py-3 border-b border-surface text-left"
              >
                {/* 썸네일 */}
                {(() => {
                  const isMe =
                    currentUser &&
                    String(item.user?.id) === String(currentUser.id);
                  const ring = isMe ? 'ring-2 ring-accent ring-offset-1' : '';
                  return (
                    <div className="relative flex-shrink-0">
                      {getThumb(item) ? (
                        <img
                          src={getThumb(item)}
                          alt=""
                          className={`w-16 h-16 rounded-[8px] object-cover ${ring}`}
                        />
                      ) : (
                        <div
                          className={`w-16 h-16 rounded-[8px] bg-surface-strong ${ring}`}
                        />
                      )}
                      {isMe && (
                        <span className="absolute -bottom-[6px] -right-[11px] bg-white text-accent text-[11px] font-semibold italic px-[3px] py-[1px] rounded-full leading-none border border-accent">
                          me
                        </span>
                      )}
                    </div>
                  );
                })()}
                {/* 텍스트 */}
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-[14px] font-bold text-text truncate">
                    {item.title}
                  </p>
                  <p className="text-[13px] text-text-muted truncate mt-0.5">
                    {item.content || ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                    <span>{item.user?.nickname || '익명'}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                    {item.commentCount > 0 && (
                      <>
                        <span>·</span>
                        <MessageSquare size={11} strokeWidth={1.5} />
                        <span>{item.commentCount}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* 카드 뷰 (2열 masonry) */
          <div className="columns-2 gap-2">
            {items.map((item: any) => {
              const isMe =
                currentUser && String(item.user?.id) === String(currentUser.id);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/recycle/detail/${item.id}`)}
                  className="w-full mb-2 break-inside-avoid text-left relative"
                >
                  {/* me 뱃지 */}
                  {isMe && (
                    <span className="absolute top-2 left-2 z-10 bg-white text-accent text-[10px] font-semibold italic px-1.5 py-0.5 rounded-full leading-none border border-accent">
                      me
                    </span>
                  )}
                  {/* 이미지 (원본 비율) */}
                  {getThumb(item) ? (
                    <img
                      src={getThumb(item)}
                      alt=""
                      className={`w-full h-auto rounded-t-[10px] object-cover ${isMe ? 'ring-2 ring-accent' : ''}`}
                    />
                  ) : (
                    <div
                      className={`w-full aspect-square rounded-t-[10px] bg-surface-strong flex items-center justify-center ${isMe ? 'ring-2 ring-accent' : ''}`}
                    >
                      <User
                        size={32}
                        strokeWidth={1}
                        className="text-text-muted"
                      />
                    </div>
                  )}
                  {/* 텍스트 */}
                  <div className="px-2 py-2 bg-surface rounded-b-[10px]">
                    <p className="text-[13px] font-bold text-text truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {item.content || ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 무한스크롤 감지 */}
        <div ref={observerRef} className="h-10">
          {isLoadingMore && (
            <p className="text-center text-[13px] text-text-muted py-2">
              불러오는 중...
            </p>
          )}
        </div>
      </div>
    </>
  );
}
