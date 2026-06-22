import SubPageHeader from '@/components/common/SubPageHeader';
import { privacyPolicyContent } from './privacyPolicyContent';

// 개인정보 처리방침 열람 페이지
export default function PrivacyPolicyPage() {
  const { title, lastUpdated, sections } = privacyPolicyContent;

  return (
    <>
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
    </>
  );
}
