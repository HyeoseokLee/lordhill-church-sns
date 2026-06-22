import FullHeightBox from '@/components/common/FullHeightBox';
import { termsOfServiceContent } from '@/pages/my/terms/termsOfServiceContent';

// 공개 서비스 이용약관 페이지 (로그인 불필요, 앱 심사용)
export default function PublicTermsOfServicePage() {
  const { title, lastUpdated, sections } = termsOfServiceContent;

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
