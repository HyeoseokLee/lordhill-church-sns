import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import toast from 'react-hot-toast';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { blockApi } from '@/api/blockApi';

interface BlockedUser {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
}

// 차단한 사용자 관리 페이지
export default function BlockedUsersPage() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocked = () => {
    blockApi
      .getBlockedUsers()
      .then(res => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleUnblock = async (userId: number, nickname: string) => {
    try {
      await blockApi.unblock(userId);
      toast.success(`${nickname}님의 차단이 해제되었습니다.`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch {
      toast.error('차단 해제에 실패했습니다.');
    }
  };

  return (
    <FullHeightBox>
      <SubPageHeader title="차단한 사용자" />
      <div className="scrollInner">
        {loading ? (
          <div className="py-8 text-center text-text-muted text-[14px]">
            불러오는 중...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-[14px]">
            차단한 사용자가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center">
                      <User
                        size={20}
                        strokeWidth={1.5}
                        className="text-text-muted"
                      />
                    </div>
                  )}
                  <span className="text-[15px] text-text font-medium">
                    {user.nickname || '익명'}
                  </span>
                </div>
                <button
                  onClick={() => handleUnblock(user.id, user.nickname)}
                  className="px-3 py-1.5 text-[13px] text-error font-medium bg-red-50 rounded-[8px] active:scale-[0.97] transition-transform duration-100"
                >
                  차단 해제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </FullHeightBox>
  );
}
