import FullHeightBox from '@/components/common/FullHeightBox';
import { privacyPolicyContent } from '@/pages/my/terms/privacyPolicyContent';

// 공개 개인정보 처리방침 페이지 (로그인 불필요, 앱 심사용)
export default function PublicPrivacyPolicyPage() {
  const { title, lastUpdated, sections } = privacyPolicyContent;

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <header className="w-full py-4 px-5">
        <h1 className="text-[20px] font-bold text-text">{title}</h1>
      </header>
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
