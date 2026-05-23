import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

// 마이페이지 메인
export default function MyPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 서버 로그아웃 실패해도 클라이언트는 정리
    }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* 상단 헤더 (고정, 스크롤 안 됨) */}
      <header className="w-full flex items-center justify-between py-4 px-5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          마이페이지
        </h1>
      </header>

      {/* 스크롤 영역 */}
      <div className="scrollInner">
        <p className="mt-2 text-sm text-text-muted">
          {currentUser?.name || '사용자'}
        </p>
        {/* TODO: 프로필 요약 + 메뉴 */}

        <button
          onClick={handleLogout}
          className="mt-6 w-full py-3 border border-error text-error font-bold text-[14px] rounded-[12px] hover:bg-red-50 transition-colors duration-150 active:scale-[0.98]"
        >
          로그아웃
        </button>
      </div>
    </>
  );
}
