import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { isAndroid } from '@/util/deviceUtil';

interface Props {
  images: { id: number; url: string }[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

// 이미지 전체화면 뷰어 (핀치 줌 + 패닝)
export default function ImageFullscreenViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    scale: 1,
    lastDist: 0,
    isDragging: false,
    lastPan: { x: 0, y: 0 },
    translate: { x: 0, y: 0 },
    lastTap: 0,
  });

  // stateRef 동기화
  useEffect(() => {
    stateRef.current.scale = scale;
    stateRef.current.translate = translate;
  }, [scale, translate]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Android 뒤로가기 버튼으로 전체화면 닫기 (iOS는 적용하지 않음)
  const android = isAndroid();

  const closeViaHistory = useCallback(() => {
    if (android) {
      history.back();
    } else {
      onClose();
    }
  }, [android, onClose]);

  useEffect(() => {
    if (!open || !android) return;

    history.pushState({ imageFullscreen: true }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (history.state?.imageFullscreen) {
        history.back();
      }
    };
  }, [open, onClose, android]);

  // 네이티브 터치 이벤트 등록 (passive: false로 preventDefault 가능)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !open) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - stateRef.current.lastTap < 300) {
          e.preventDefault();
          if (stateRef.current.scale > 1) {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
          } else {
            setScale(2.5);
          }
        }
        stateRef.current.lastTap = now;
        stateRef.current.lastPan = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        stateRef.current.isDragging = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (stateRef.current.lastDist > 0) {
          const delta = dist / stateRef.current.lastDist;
          setScale(prev => Math.min(Math.max(prev * delta, 1), 5));
        }
        stateRef.current.lastDist = dist;
      } else if (e.touches.length === 1 && stateRef.current.scale > 1) {
        e.preventDefault();
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;

        if (stateRef.current.isDragging) {
          const dx = x - stateRef.current.lastPan.x;
          const dy = y - stateRef.current.lastPan.y;
          setTranslate(prev => ({
            x: prev.x + dx,
            y: prev.y + dy,
          }));
        }
        stateRef.current.isDragging = true;
        stateRef.current.lastPan = { x, y };
      }
    };

    const onTouchEnd = () => {
      stateRef.current.lastDist = 0;
      stateRef.current.isDragging = false;
      if (stateRef.current.scale <= 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [open, resetZoom]);

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
      closeViaHistory();
    } else {
      resetZoom();
    }
  };

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      style={{ touchAction: 'none' }}
      onClick={handleBackgroundClick}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={e => {
          e.stopPropagation();
          closeViaHistory();
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
        className="max-w-full max-h-full object-contain select-none pointer-events-none"
        style={{
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          transition: scale === 1 ? 'transform 0.2s' : 'none',
        }}
        draggable={false}
      />
    </div>
  );
}
