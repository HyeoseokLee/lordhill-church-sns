import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import { ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { privacyPolicyContent } from '@/pages/my/terms/privacyPolicyContent';
import { termsOfServiceContent } from '@/pages/my/terms/termsOfServiceContent';

interface Props {
  open: boolean;
  onAccept: () => void;
  loading?: boolean;
}

// 약관동의 모달
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
    <Dialog
      open={open}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {expandedContent ? (
        // 약관 전문 보기
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-5 py-3">
            <button
              onClick={() => setExpandedSection(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted"
            >
              <ArrowLeft size={22} strokeWidth={1.5} />
            </button>
            <h2 className="text-[18px] font-bold text-text">
              {expandedContent.title}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8">
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
        </div>
      ) : (
        // 약관동의 메인
        <div className="flex flex-col h-full">
          <div className="flex-1 px-5 pt-12">
            <h2 className="text-[22px] font-bold text-text mb-2">
              서비스 이용 동의
            </h2>
            <p className="text-[14px] text-text-muted mb-8">
              서비스 이용을 위해 아래 약관에 동의해 주세요.
            </p>

            {/* 전체 동의 */}
            <button
              onClick={handleAllCheck}
              className="flex items-center gap-3 py-3.5 px-4 mb-4 rounded-[12px] bg-surface w-full"
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
            <div className="flex items-center justify-between py-3.5 px-1">
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
            <div className="flex items-center justify-between py-3.5 px-1">
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
          </div>

          {/* 하단 고정 버튼 */}
          <div className="px-5 pb-8 pt-4">
            <button
              onClick={onAccept}
              disabled={!allChecked || loading}
              className={`w-full py-3.5 text-[15px] font-bold rounded-[12px] transition-colors duration-150 ${
                allChecked
                  ? 'bg-accent text-white active:scale-[0.98]'
                  : 'bg-surface-strong text-text-muted cursor-not-allowed'
              }`}
            >
              {loading ? '처리 중...' : '동의하고 시작하기'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
