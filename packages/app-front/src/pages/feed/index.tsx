import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import {
  Bell,
  Lightbulb,
  Megaphone,
  ChevronDown,
  MessageCircle,
  Heart,
  MessageSquare,
  User,
} from 'lucide-react';
import { useFeed } from '@/hooks/api/useFeed';
import { useAuthStore } from '@/stores/authStore';
import { postApi } from '@/api/postApi';
import { noticeApi } from '@/api/noticeApi';
import { formatRelativeTime } from '@/util/dateUtil';
import { delayNavigate } from '@/util/navigateUtil';
import { useUnreadCount } from '@/hooks/api/usePushs';
import ImageCarousel from '@/components/common/ImageCarousel';
import ImageFullscreenViewer from '@/components/common/ImageFullscreenViewer';
import IcMealBtn from '@/assets/icons/ic_meal_btn.svg?react';

// 홈 피드 페이지
export default function FeedPage() {
  const navigate = useNavigate();
  const { mutate: swrMutate } = useSWRConfig();
  const currentUser = useAuthStore(s => s.user);
  const { count: unreadCount } = useUnreadCount();
  const { posts, hasMore, isLoading, isLoadingMore, loadMore, mutate } =
    useFeed();
  const observerRef = useRef<HTMLDivElement>(null);

  // 최신 공지사항
  const [latestNotice, setLatestNotice] = useState<any>(null);
  const [noticeExpanded, setNoticeExpanded] = useState(false);
  const [noticeAnimating, setNoticeAnimating] = useState(false);
  const [noticeViewerOpen, setNoticeViewerOpen] = useState(false);
  const [noticeViewerIndex, setNoticeViewerIndex] = useState(0);
  useEffect(() => {
    noticeApi
      .getAll()
      .then(res => {
        if (res.data?.length > 0) setLatestNotice(res.data[0]);
      })
      .catch(() => {});
  }, []);

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
            className="w-10 h-10 flex items-center justify-center rounded-full text-text hover:bg-surface transition-colors duration-150"
          >
            <Lightbulb size={22} strokeWidth={1.5} />
          </button>
          {/* 알림 */}
          <button
            onClick={() => delayNavigate(navigate, '/notifications')}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-text hover:bg-surface transition-colors duration-150"
          >
            <Bell size={22} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {/* 식사주문 */}
          <button
            onClick={() => delayNavigate(navigate, '/feed/meal')}
            className="w-10 h-10 flex items-center justify-center rounded-full text-text hover:bg-surface transition-colors duration-150"
          >
            <IcMealBtn width={22} height={22} fill="currentColor" />
          </button>
        </div>
      </header>

      {/* 스크롤 영역 */}
      <div className="scrollInner">
        {/* 최신 공지사항 (펼쳤을 때 피드 위에 오버레이) */}
        {latestNotice && (
          <div className="relative mb-4" style={{ minHeight: 52 }}>
            <div
              className={`${noticeExpanded || noticeAnimating ? 'absolute left-0 right-0 z-30' : ''}`}
            >
              <button
                onClick={() => {
                  if (noticeExpanded) {
                    setNoticeExpanded(false);
                    setNoticeAnimating(true);
                    setTimeout(() => setNoticeAnimating(false), 150);
                  } else {
                    setNoticeExpanded(true);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 border-[3px] border-accent rounded-2xl text-left bg-white"
              >
                <Megaphone
                  size={20}
                  strokeWidth={1.8}
                  className="text-accent flex-shrink-0"
                />
                <span className="flex-1 text-[14px] font-semibold text-text truncate">
                  {latestNotice.title}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-accent flex-shrink-0 transition-transform duration-200 ${
                    noticeExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-150 ease-out"
                style={{
                  maxHeight: noticeExpanded ? 2000 : 0,
                  marginTop: noticeExpanded ? 4 : 0,
                }}
              >
                <div className="px-4 py-3 border-2 border-accent/30 rounded-2xl bg-white shadow-lg">
                  <div
                    className="text-[13px] text-text leading-[1.7] ql-content"
                    dangerouslySetInnerHTML={{ __html: latestNotice.content }}
                  />
                  {latestNotice.media?.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      {latestNotice.media.map((m: any, i: number) => (
                        <img
                          key={m.id}
                          src={m.url}
                          alt=""
                          className="w-full rounded-[8px] object-cover cursor-pointer"
                          onClick={() => {
                            setNoticeViewerIndex(i);
                            setNoticeViewerOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {latestNotice.media?.length > 0 && (
              <ImageFullscreenViewer
                images={latestNotice.media}
                initialIndex={noticeViewerIndex}
                open={noticeViewerOpen}
                onClose={() => setNoticeViewerOpen(false)}
              />
            )}
          </div>
        )}

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
                      size={22}
                      strokeWidth={1.5}
                      className={post.isLiked ? 'fill-error text-error' : ''}
                    />
                    <span className="text-[13px]">{post.likeCount || 0}</span>
                  </button>
                  <button
                    onClick={() => {
                      swrMutate(`/posts/${post.id}`, post, false);
                      delayNavigate(navigate, `/feed/detail/${post.id}`);
                    }}
                    className="flex items-center gap-1"
                  >
                    <MessageSquare size={22} strokeWidth={1.5} />
                    <span className="text-[13px]">
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
