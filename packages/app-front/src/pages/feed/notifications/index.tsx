import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { usePushs, useUnreadCount } from '@/hooks/api/usePushs';
import { pushApi } from '@/api/pushApi';
import { formatRelativeTime } from '@/util/dateUtil';
import { delayNavigate } from '@/util/navigateUtil';

// 알림 페이지
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { items, totalPages, isLoading, mutate } = usePushs(page);
  const { mutate: mutateUnread } = useUnreadCount();

  // 알림 탭 → 읽음 처리 + 해당 경로로 이동 (자식 라우트로 슬라이드 전환)
  const handleTap = async (item: any) => {
    if (!item.isRead) {
      await pushApi.markAsRead(String(item.id));
      mutate();
      mutateUnread();
    }
    if (item.path) {
      // 절대경로를 알림의 자식 라우트 상대경로로 변환 (슬라이드 전환)
      // /feed/detail/123 → feed/123, /recycle/detail/456 → recycle/456
      const feedMatch = item.path.match(/^\/feed\/detail\/(.+)$/);
      const recycleMatch = item.path.match(/^\/recycle\/detail\/(.+)$/);
      if (feedMatch) {
        delayNavigate(navigate, `feed/${feedMatch[1]}`);
      } else if (recycleMatch) {
        delayNavigate(navigate, `recycle/${recycleMatch[1]}`);
      } else {
        navigate(item.path);
      }
    }
  };

  // 전체 읽음
  const handleMarkAllRead = async () => {
    await pushApi.markAllAsRead();
    mutate();
    mutateUnread();
  };

  // 헤더 우측 전체 읽음 버튼
  const readAllButton = (
    <button
      onClick={handleMarkAllRead}
      className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
    >
      <CheckCheck size={20} strokeWidth={1.5} />
    </button>
  );

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="알림" right={readAllButton} />

      <div className="scrollInner">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-text-muted">불러오는 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell
              size={48}
              strokeWidth={1}
              className="text-surface-strong mb-4"
            />
            <p className="text-[15px] font-semibold text-text-muted mb-1">
              알림이 없습니다
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {items.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleTap(item)}
                  className={`w-full text-left px-1 py-3.5 border-b border-surface ${
                    item.isRead ? '' : 'bg-accent/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 읽지 않음 표시 */}
                    <div className="pt-1.5 flex-shrink-0">
                      {!item.isRead ? (
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-text">
                        {item.title}
                      </p>
                      <p className="text-[13px] text-text-muted mt-0.5 line-clamp-2">
                        {item.body}
                      </p>
                      <p className="text-[11px] text-text-muted mt-1">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-4 py-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-[13px] text-text-muted disabled:opacity-30"
                >
                  이전
                </button>
                <span className="text-[13px] text-text-muted">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-[13px] text-text-muted disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </FullHeightBox>
  );
}
