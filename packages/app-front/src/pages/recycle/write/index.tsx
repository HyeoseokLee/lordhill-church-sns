import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';

// 재활용/나눔 글쓰기 페이지 (돌고래의 자식)
export default function RecycleWritePage() {
  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="나눔 글쓰기" />
      <div className="scrollInner">
        <div className="w-full">
          <p className="text-sm text-text-muted">
            재활용/나눔 글쓰기 페이지입니다.
          </p>
          {/* TODO: 나눔 글쓰기 폼 */}
        </div>
      </div>
    </FullHeightBox>
  );
}
