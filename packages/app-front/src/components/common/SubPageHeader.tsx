import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  // 우측 액션 영역 (선택)
  right?: React.ReactNode;
  // 히스토리가 없을 때 이동할 경로 (푸시 딥링크 등으로 직접 진입 시)
  fallbackPath?: string;
}

// 자식 페이지 공통 헤더 (뒤로가기 + 제목)
export default function SubPageHeader({ title, right, fallbackPath }: Props) {
  const navigate = useNavigate();

  const handleBack = () => {
    const idx = (window.history.state as any)?.idx;
    if (idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath || '/feed', { replace: true });
    }
  };

  return (
    <header className="w-full flex items-center justify-between py-3 px-5">
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          className="-ml-2 w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
        >
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[18px] font-bold text-text">{title}</h1>
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
