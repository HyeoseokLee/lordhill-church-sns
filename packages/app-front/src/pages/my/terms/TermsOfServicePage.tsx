import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { termsOfServiceContent } from './termsOfServiceContent';

// 서비스 이용약관 열람 페이지
export default function TermsOfServicePage() {
  const { title, lastUpdated, sections } = termsOfServiceContent;

  return (
    <FullHeightBox>
      <SubPageHeader title={title} />
      <div className="scrollInner">
        <p className="text-[13px] text-text-muted mb-6">
          최종 수정일: {lastUpdated}
        </p>
        {sections.map((section, i) => (
          <div key={i} className="mb-6">
            <h2 className="text-[15px] font-bold text-text mb-2">
              {section.heading}
            </h2>
            <p className="text-[14px] text-text leading-[1.7] whitespace-pre-line">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </FullHeightBox>
  );
}
