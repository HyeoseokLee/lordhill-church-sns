import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import FullHeightBox from '@/components/common/FullHeightBox';
import TermsConsentModal from '@/components/common/TermsConsentModal';
import { userApi } from '@/api/userApi';

// 인증된 페이지의 공통 레이아웃 (BottomNavigation은 각 메인 탭 페이지에서 관리)
export default function MainLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const setUser = useAuthStore(s => s.setUser);
  const [termsLoading, setTermsLoading] = useState(false);

  // 약관 미동의 시 동의 처리
  const handleAcceptTerms = async () => {
    setTermsLoading(true);
    try {
      const res = await userApi.acceptTerms();
      setUser(res.data);
    } catch (err) {
      console.error('약관 동의 실패:', err);
    } finally {
      setTermsLoading(false);
    }
  };

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

  const needsTermsConsent = user && !user.tosAcceptedAt;

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <Outlet />
      {/* 약관 미동의 시 바텀 드로어 표시 */}
      <TermsConsentModal
        open={!!needsTermsConsent}
        onAccept={handleAcceptTerms}
        loading={termsLoading}
      />
    </FullHeightBox>
  );
}
