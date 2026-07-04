import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { Bell, MessageCircle, Heart, MessageSquare, User } from 'lucide-react';
import { useFeed } from '@/hooks/api/useFeed';
import { useAuthStore } from '@/stores/authStore';
import { postApi } from '@/api/postApi';
import { formatRelativeTime } from '@/util/dateUtil';
import { delayNavigate } from '@/util/navigateUtil';
import { useUnreadCount } from '@/hooks/api/usePushs';
import ImageCarousel from '@/components/common/ImageCarousel';

// 홈 피드 페이지
export default function FeedPage() {
  const navigate = useNavigate();
  const { mutate: swrMutate } = useSWRConfig();
  const currentUser = useAuthStore(s => s.user);
  const { count: unreadCount } = useUnreadCount();
  const { posts, hasMore, isLoading, isLoadingMore, loadMore, mutate } =
    useFeed();
  const observerRef = useRef<HTMLDivElement>(null);

  // 자식 페이지(글쓰기)에서 신호를 받으면 피드 새로고침
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);
  useEffect(() => {
    const handler = () => mutateRef.current();
    window.addEventListener('feed-refresh', handler);
    return () => window.removeEventListener('feed-refresh', handler);
  }, []);

  // 무한스크롤 — IntersectionObserver
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

  return (
    <>
      {/* 상단 헤더 (고정, 스크롤 안 됨) */}
      <header className="w-full flex items-center justify-between py-4 px-5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          주안의 교회
        </h1>
        <div className="flex items-center">
          {/* 개선요청 */}
          <button
            onClick={() => delayNavigate(navigate, '/feed/suggestions')}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors duration-150"
          >
            <span
              className="animate-[wiggle_1.5s_ease-in-out_infinite]"
              style={{
                display: 'inline-flex',
                background:
                  'linear-gradient(135deg, #FF6B6B, #FFA94D, #FFD43B, #69DB7C, #4DABF7, #9775FA)',
                WebkitMask:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/%3E%3Cpath d='M9 18h6'/%3E%3Cpath d='M10 22h4'/%3E%3C/svg%3E\") center/contain no-repeat",
                mask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/%3E%3Cpath d='M9 18h6'/%3E%3Cpath d='M10 22h4'/%3E%3C/svg%3E\") center/contain no-repeat",
                width: 22,
                height: 22,
              }}
            />
          </button>
          {/* 알림 */}
          <button
            onClick={() => delayNavigate(navigate, '/notifications')}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
          >
            <Bell size={22} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 스크롤 영역 */}
      <div className="scrollInner">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-text-muted">불러오는 중...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle
              size={48}
              strokeWidth={1}
              className="text-surface-strong mb-4"
            />
            <p className="text-[15px] font-semibold text-text-muted mb-1">
              아직 게시글이 없습니다
            </p>
            <p className="text-[13px] text-text-muted">
              첫 번째 게시글을 작성해보세요!
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            {posts.map((post: any) => (
              <article
                key={post.id}
                className="py-4 border-b border-surface last:border-0"
              >
                {/* 작성자 */}
                <div className="flex items-center gap-3 mb-3">
                  {(() => {
                    const isMe =
                      currentUser &&
                      String(post.user?.id) === String(currentUser.id);
                    const ring = isMe ? 'ring-2 ring-accent ring-offset-1' : '';
                    return (
                      <div className="relative flex-shrink-0">
                        {post.user?.profileImageUrl ? (
                          <img
                            src={post.user.profileImageUrl}
                            alt=""
                            className={`w-9 h-9 rounded-full object-cover ${ring}`}
                          />
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-full bg-surface-strong flex items-center justify-center ${ring}`}
                          >
                            <User
                              size={18}
                              strokeWidth={1.5}
                              className="text-text-muted"
                            />
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
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-text truncate">
                      {post.user?.nickname || '익명'}
                    </p>
                    <p className="text-[12px] text-text-muted">
                      {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* 본문 (클릭 시 상세 이동) */}
                {post.content && (
                  <button
                    onClick={() => {
                      swrMutate(`/posts/${post.id}`, post, false);
                      delayNavigate(navigate, `/feed/detail/${post.id}`);
                    }}
                    className="w-full text-left"
                  >
                    <p className="text-[14px] text-text leading-relaxed whitespace-pre-wrap mb-3">
                      {post.content}
                    </p>
                  </button>
                )}
                {/* 이미지 (클릭 시 전체화면) */}
                {post.media?.length > 0 && (
                  <ImageCarousel images={post.media} />
                )}

                {/* 좋아요/댓글 카운트 */}
                <div className="flex items-center gap-4 text-text-muted">
                  <button
                    onClick={() =>
                      postApi.toggleLike(String(post.id)).then(() => mutate())
                    }
                    className="flex items-center gap-1"
                  >
                    <Heart
                      size={16}
                      strokeWidth={1.5}
                      className={post.isLiked ? 'fill-error text-error' : ''}
                    />
                    <span className="text-[12px]">{post.likeCount || 0}</span>
                  </button>
                  <button
                    onClick={() => {
                      swrMutate(`/posts/${post.id}`, post, false);
                      delayNavigate(
                        navigate,
                        `/feed/detail/${post.id}?focus=comment`,
                      );
                    }}
                    className="flex items-center gap-1"
                  >
                    <MessageSquare size={16} strokeWidth={1.5} />
                    <span className="text-[12px]">
                      {post.commentCount || 0}
                    </span>
                  </button>
                </div>
              </article>
            ))}

            {/* 무한스크롤 감지 영역 */}
            <div ref={observerRef} className="h-10">
              {isLoadingMore && (
                <p className="text-center text-[13px] text-text-muted py-2">
                  불러오는 중...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
