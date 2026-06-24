import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { faqContent } from './faqContent';

// 자주 묻는 질문 페이지 (아코디언)
export default function FaqPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <FullHeightBox>
      <SubPageHeader title="자주 묻는 질문" />
      <div className="scrollInner">
        <div className="flex flex-col gap-2">
          {faqContent.map((item, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={i}
                className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <p className="text-[15px] font-medium text-text flex-1 min-w-0 pr-2">
                    {item.question}
                  </p>
                  <ChevronDown
                    size={18}
                    className={`text-text-muted flex-shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-surface">
                    <p className="pt-3 text-[14px] text-text leading-[1.7]">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </FullHeightBox>
  );
}
