import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import FullHeightBox from '@/components/common/FullHeightBox';

// 인증된 페이지의 공통 레이아웃 (BottomNavigation은 각 메인 탭 페이지에서 관리)
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
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <Outlet />
    </FullHeightBox>
  );
}
