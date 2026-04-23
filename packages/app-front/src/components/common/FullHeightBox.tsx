import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 모바일 웹뷰에서 visualViewport 리사이즈(키보드 등)에 반응하는 전체 높이 컨테이너.
 * FullHeightBox 안에 scrollInner 클래스를 쓰면 스크롤 가능한 콘텐츠 영역이 됨.
 */
export default function FullHeightBox({ children, className = '', style }: Props) {
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setHeight(window.visualViewport?.height ?? window.innerHeight);
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className={`relative flex w-full flex-col items-start justify-between overflow-hidden ${className}`}
      style={{ height: `${height}px`, ...style }}
    >
      {children}
    </div>
  );
}
