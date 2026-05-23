import { useAuthStore } from '@/stores/authStore';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';

// 프로필 수정 페이지 (마이페이지의 자식)
export default function ProfilePage() {
  const currentUser = useAuthStore(s => s.user);

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="프로필 수정" />
      <div className="scrollInner">
        <div className="w-full">
          <p className="text-sm text-text-muted">
            {currentUser?.name || '사용자'}
          </p>
          {/* TODO: 프로필 수정 폼 */}
        </div>
      </div>
    </FullHeightBox>
  );
}
