import { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import { ChevronRight, Check } from 'lucide-react';
import { privacyPolicyContent } from '@/pages/my/terms/privacyPolicyContent';
import { termsOfServiceContent } from '@/pages/my/terms/termsOfServiceContent';

interface Props {
  open: boolean;
  onAccept: () => void;
  loading?: boolean;
}

// 약관동의 바텀 드로어 모달
export default function TermsConsentModal({ open, onAccept, loading }: Props) {
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  // 약관 전문 보기 상태
  const [expandedSection, setExpandedSection] = useState<
    'privacy' | 'terms' | null
  >(null);

  const allChecked = privacyChecked && termsChecked;

  const handleAllCheck = () => {
    const next = !allChecked;
    setPrivacyChecked(next);
    setTermsChecked(next);
  };

  const toggleSection = (section: 'privacy' | 'terms') => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  const expandedContent =
    expandedSection === 'privacy'
      ? privacyPolicyContent
      : expandedSection === 'terms'
        ? termsOfServiceContent
        : null;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            maxHeight: '85vh',
            maxWidth: '480px',
            margin: '0 auto',
          },
        },
      }}
    >
      <div className="px-5 pt-6 pb-8 flex flex-col">
        {/* 드래그 핸들 */}
        <div className="w-10 h-1 bg-surface-strong rounded-full mx-auto mb-5" />

        {expandedContent ? (
          <>
            {/* 약관 전문 보기 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-text">
                {expandedContent.title}
              </h2>
              <button
                onClick={() => setExpandedSection(null)}
                className="text-[14px] text-accent font-medium"
              >
                닫기
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[55vh] pr-1">
              <p className="text-[12px] text-text-muted mb-4">
                최종 수정일: {expandedContent.lastUpdated}
              </p>
              {expandedContent.sections.map((section, i) => (
                <div key={i} className="mb-4">
                  <h3 className="text-[14px] font-bold text-text mb-1">
                    {section.heading}
                  </h3>
                  <p className="text-[13px] text-text leading-[1.7] whitespace-pre-line">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* 약관동의 메인 */}
            <h2 className="text-[20px] font-bold text-text mb-2">
              서비스 이용 동의
            </h2>
            <p className="text-[14px] text-text-muted mb-6">
              서비스 이용을 위해 아래 약관에 동의해 주세요.
            </p>

            {/* 전체 동의 */}
            <button
              onClick={handleAllCheck}
              className="flex items-center gap-3 py-3.5 px-4 mb-3 rounded-[12px] bg-surface"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-150 ${
                  allChecked ? 'bg-accent' : 'bg-surface-strong'
                }`}
              >
                <Check
                  size={14}
                  strokeWidth={2.5}
                  className={allChecked ? 'text-white' : 'text-text-muted'}
                />
              </div>
              <span className="text-[15px] font-bold text-text">전체 동의</span>
            </button>

            {/* 개인정보 처리방침 */}
            <div className="flex items-center justify-between py-3 px-1">
              <button
                onClick={() => setPrivacyChecked(prev => !prev)}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-150 ${
                    privacyChecked ? 'bg-accent' : 'bg-surface-strong'
                  }`}
                >
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    className={
                      privacyChecked ? 'text-white' : 'text-text-muted'
                    }
                  />
                </div>
                <span className="text-[14px] text-text">
                  <span className="text-accent font-medium">[필수]</span>{' '}
                  개인정보 처리방침
                </span>
              </button>
              <button
                onClick={() => toggleSection('privacy')}
                className="text-text-muted"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 서비스 이용약관 */}
            <div className="flex items-center justify-between py-3 px-1">
              <button
                onClick={() => setTermsChecked(prev => !prev)}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-150 ${
                    termsChecked ? 'bg-accent' : 'bg-surface-strong'
                  }`}
                >
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    className={termsChecked ? 'text-white' : 'text-text-muted'}
                  />
                </div>
                <span className="text-[14px] text-text">
                  <span className="text-accent font-medium">[필수]</span> 서비스
                  이용약관
                </span>
              </button>
              <button
                onClick={() => toggleSection('terms')}
                className="text-text-muted"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 동의 버튼 */}
            <button
              onClick={onAccept}
              disabled={!allChecked || loading}
              className={`mt-6 w-full py-3.5 text-[15px] font-bold rounded-[12px] transition-colors duration-150 ${
                allChecked
                  ? 'bg-accent text-white active:scale-[0.98]'
                  : 'bg-surface-strong text-text-muted cursor-not-allowed'
              }`}
            >
              {loading ? '처리 중...' : '동의하고 시작하기'}
            </button>
          </>
        )}
      </div>
    </Drawer>
  );
}
