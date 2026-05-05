import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import BottomNavigation from '@/components/common/BottomNavigation';

// 인증된 페이지의 공통 레이아웃
export default function MainLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-text-muted text-[15px]">로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'PENDING') {
    return <Navigate to="/login/pending" replace />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-bg">
      <main className="flex-1 overflow-hidden" style={{ height: 'calc(100dvh - 72px)' }}>
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
