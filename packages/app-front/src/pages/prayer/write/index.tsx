import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';

// 기도 작성 페이지 (기도의 자식)
export default function PrayerWritePage() {
  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="기도 작성" />
      <div className="scrollInner">
        <div className="w-full">
          <p className="text-sm text-text-muted">기도 작성 페이지입니다.</p>
          {/* TODO: 기도 작성 폼 */}
        </div>
      </div>
    </FullHeightBox>
  );
}
