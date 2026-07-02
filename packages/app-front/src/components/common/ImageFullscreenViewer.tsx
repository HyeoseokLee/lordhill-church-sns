import { useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: { id: number; url: string }[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

// 이미지 전체화면 뷰어 (핀치 줌 + 스와이프)
export default function ImageFullscreenViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });

  // 초기화
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // 핀치 줌
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (lastDistRef.current > 0) {
          const delta = dist / lastDistRef.current;
          setScale(prev => Math.min(Math.max(prev * delta, 1), 5));
        }
        lastDistRef.current = dist;
      } else if (e.touches.length === 1 && scale > 1) {
        // 확대 상태에서 패닝
        e.preventDefault();
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        if (isDraggingRef.current) {
          setTranslate(prev => ({
            x: prev.x + (x - lastPanRef.current.x),
            y: prev.y + (y - lastPanRef.current.y),
          }));
        }
        isDraggingRef.current = true;
        lastPanRef.current = { x, y };
      }
    },
    [scale],
  );

  const handleTouchEnd = useCallback(() => {
    lastDistRef.current = 0;
    isDraggingRef.current = false;
    if (scale <= 1) {
      resetZoom();
    }
  }, [scale, resetZoom]);

  // 이전/다음 이미지
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  };

  const goNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  };

  // 배경 클릭으로 닫기 (확대 안 된 상태에서만)
  const handleBackgroundClick = () => {
    if (scale <= 1) {
      onClose();
    } else {
      resetZoom();
    }
  };

  // 더블탭 줌
  const lastTapRef = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // 더블탭
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
        }
      }
      lastTapRef.current = now;
    }
  };

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      style={{ touchAction: 'none' }}
      onClick={handleBackgroundClick}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white"
      >
        <X size={22} />
      </button>

      {/* 이미지 카운터 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/70 text-[14px]">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* 이전 버튼 */}
      {images.length > 1 && currentIndex > 0 && (
        <button
          onClick={e => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* 다음 버튼 */}
      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={e => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* 이미지 */}
      <img
        src={currentImage.url}
        alt=""
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          transition: scale === 1 ? 'transform 0.2s' : 'none',
          touchAction: 'none',
        }}
        draggable={false}
      />
    </div>
  );
}
