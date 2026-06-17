import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, LayoutGrid, MessageSquare, User } from 'lucide-react';
import { useRecycles } from '@/hooks/api/useRecycles';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/util/dateUtil';
import { delayNavigate } from '@/util/navigateUtil';

// 돌고래(재활용/나눔) 메인 페이지
export default function RecyclePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    const saved = localStorage.getItem('recycle-view-mode');
    return saved === 'list' ? 'list' : 'card';
  });
  const { items, hasMore, isLoading, isLoadingMore, loadMore, mutate } =
    useRecycles();
  const observerRef = useRef<HTMLDivElement>(null);

  // 자식 페이지에서 새로고침 신호
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);
  useEffect(() => {
    const handler = () => mutateRef.current();
    window.addEventListener('recycle-refresh', handler);
    return () => window.removeEventListener('recycle-refresh', handler);
  }, []);

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
          onClick={() =>
            setViewMode(v => {
              const next = v === 'list' ? 'card' : 'list';
              localStorage.setItem('recycle-view-mode', next);
              return next;
            })
          }
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
          viewMode === 'list' ? (
            /* 리스트 뷰 스켈레톤 */
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="flex gap-3 py-3 border-b border-surface animate-pulse"
                >
                  <div className="w-16 h-16 rounded-[8px] bg-surface-strong flex-shrink-0" />
                  <div className="flex-1 py-0.5">
                    <div className="h-3.5 w-3/5 bg-surface-strong rounded mb-2" />
                    <div className="h-3 w-4/5 bg-surface rounded mb-2" />
                    <div className="h-2.5 w-1/3 bg-surface rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 카드 뷰 스켈레톤 */
            <div className="columns-2 gap-2">
              {[140, 200, 170, 120, 190, 150].map((h, i) => (
                <div key={i} className="mb-2 break-inside-avoid animate-pulse">
                  <div
                    className="w-full rounded-t-[10px] bg-surface-strong"
                    style={{ height: h }}
                  />
                  <div className="px-2 py-2 bg-surface rounded-b-[10px]">
                    <div className="h-3.5 w-3/4 bg-surface-strong rounded mb-1.5" />
                    <div className="h-2.5 w-1/2 bg-surface-strong rounded" />
                  </div>
                </div>
              ))}
            </div>
          )
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
                onClick={() =>
                  delayNavigate(navigate, `/recycle/detail/${item.id}`)
                }
                className="w-full flex gap-3 py-3 border-b border-surface text-left"
              >
                {/* 썸네일 */}
                {(() => {
                  const isMe =
                    currentUser &&
                    String(item.user?.id) === String(currentUser.id);
                  const ring = isMe ? 'ring-2 ring-accent ring-offset-1' : '';
                  const shared = item.status === 1;
                  return (
                    <div className="relative flex-shrink-0">
                      {getThumb(item) ? (
                        <img
                          src={getThumb(item)}
                          alt=""
                          className={`w-16 h-16 rounded-[8px] object-cover ${ring} ${shared ? 'grayscale' : ''}`}
                        />
                      ) : (
                        <div
                          className={`w-16 h-16 rounded-[8px] bg-surface-strong ${ring}`}
                        />
                      )}
                      {shared && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold drop-shadow">
                            Shared
                          </span>
                        </div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-text truncate flex-1">
                      {item.title}
                    </p>
                    {item.commentCount > 0 && (
                      <span className="text-[11px] text-text-muted flex-shrink-0">
                        <MessageSquare
                          size={11}
                          strokeWidth={1.5}
                          className="inline mr-0.5"
                        />
                        {item.commentCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-text-muted truncate mt-0.5">
                    {item.content || ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                    <span>{item.user?.nickname || '익명'}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
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
              const shared = item.status === 1;
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    delayNavigate(navigate, `/recycle/detail/${item.id}`)
                  }
                  className="w-full mb-2 break-inside-avoid text-left relative"
                >
                  {/* me 뱃지 */}
                  {isMe && (
                    <span className="absolute top-2 left-2 z-10 bg-white text-accent text-[10px] font-semibold italic px-1.5 py-0.5 rounded-full leading-none border border-accent">
                      me
                    </span>
                  )}
                  {/* Shared 오버레이 */}
                  {shared && getThumb(item) && (
                    <div className="absolute top-0 left-0 right-0 bottom-8 flex items-center justify-center z-[5] pointer-events-none">
                      <span className="text-white text-[16px] font-bold drop-shadow-lg opacity-80">
                        Shared
                      </span>
                    </div>
                  )}
                  {/* 이미지 (원본 비율) */}
                  {getThumb(item) ? (
                    <img
                      src={getThumb(item)}
                      alt=""
                      className={`w-full h-auto rounded-t-[10px] object-cover ${shared ? 'grayscale' : ''}`}
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-t-[10px] bg-surface-strong flex items-center justify-center">
                      <User
                        size={32}
                        strokeWidth={1}
                        className="text-text-muted"
                      />
                    </div>
                  )}
                  {/* 텍스트 */}
                  <div className="px-2 py-2 bg-surface rounded-b-[10px]">
                    <div className="flex items-center gap-1">
                      <p className="text-[13px] font-bold text-text truncate flex-1">
                        {item.title}
                      </p>
                      {item.commentCount > 0 && (
                        <span className="text-[10px] text-text-muted flex-shrink-0">
                          <MessageSquare
                            size={10}
                            strokeWidth={1.5}
                            className="inline mr-0.5"
                          />
                          {item.commentCount}
                        </span>
                      )}
                    </div>
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
