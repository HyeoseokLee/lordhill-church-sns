import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { noticeApi } from '@/api/noticeApi';

interface Notice {
  id: number;
  title: string;
  content: string;
  displayOrder: number;
  createdAt: string;
  media?: { id: number; url: string; displayOrder: number }[];
}

// 공지사항 목록 페이지 (아코디언)
export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    noticeApi
      .getAll()
      .then(res => setNotices(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <FullHeightBox>
      <SubPageHeader title="공지사항" />
      <div className="scrollInner">
        {loading ? (
          <div className="py-8 text-center text-text-muted text-[14px]">
            불러오는 중...
          </div>
        ) : notices.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-[14px]">
            공지사항이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notices.map(notice => {
              const isExpanded = expandedId === notice.id;
              return (
                <div
                  key={notice.id}
                  className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  {/* 아코디언 헤더 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-text truncate">
                        {notice.title}
                      </p>
                      <p className="text-[12px] text-text-muted mt-0.5">
                        {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-text-muted flex-shrink-0 ml-2 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 아코디언 본문 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-surface">
                      <div
                        className="pt-3 text-[14px] text-text leading-[1.7] ql-content"
                        dangerouslySetInnerHTML={{ __html: notice.content }}
                      />
                      {notice.media?.length > 0 && (
                        <div className="flex flex-col gap-2 mt-3">
                          {notice.media.map((m: any) => (
                            <img
                              key={m.id}
                              src={m.url}
                              alt=""
                              className="w-full rounded-[8px] object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FullHeightBox>
  );
}
