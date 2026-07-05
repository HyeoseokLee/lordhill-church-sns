import { useRef, useState, useEffect } from 'react';
import ImageFullscreenViewer from './ImageFullscreenViewer';

interface Props {
  images: { id: number; url: string }[];
}

// 이미지 캐러셀 (좌우 스와이프 + 하단 인디케이터 점, 탭 시 전체화면)
export default function ImageCarousel({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxHeight, setMaxHeight] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 모든 이미지 로드 후 최대 높이 계산
  useEffect(() => {
    if (images.length === 0) return;

    let loaded = 0;
    let tallest = 0;

    images.forEach(img => {
      const el = new Image();
      el.onload = () => {
        // 컨테이너 너비(100%) 기준 비례 높이 계산
        const containerWidth = scrollRef.current?.offsetWidth || 300;
        const ratio = containerWidth / el.naturalWidth;
        const scaledHeight = el.naturalHeight * ratio;
        if (scaledHeight > tallest) tallest = scaledHeight;

        loaded++;
        if (loaded === images.length) {
          setMaxHeight(tallest);
          setLoadedCount(loaded);
        }
      };
      el.src = img.url;
    });
  }, [images]);

  // 스크롤 위치로 현재 인덱스 계산
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setCurrentIndex(index);
  };

  // 이미지 클릭 시 전체화면 뷰어 열기
  const handleImageClick = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  if (images.length === 0) return null;

  return (
    <>
      <div className="mb-3 -mx-5">
        {/* 이미지 슬라이드 영역 (부모 패딩을 벗어나 뷰포트 꽉 채움) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`flex ${images.length > 1 ? 'overflow-x-auto snap-x snap-mandatory' : 'overflow-x-hidden'}`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            height: maxHeight > 0 ? `${maxHeight}px` : 'auto',
            touchAction: images.length > 1 ? 'pan-y pinch-zoom' : 'auto',
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              className="w-full flex-shrink-0 snap-start flex items-center justify-center bg-black"
              style={{
                scrollSnapStop: 'always',
                height: maxHeight > 0 ? `${maxHeight}px` : 'auto',
              }}
              onClick={e => {
                e.stopPropagation();
                handleImageClick(i);
              }}
            >
              <img
                src={img.url}
                alt=""
                className={`w-full h-auto ${loadedCount < images.length ? 'opacity-0' : 'opacity-100'}`}
                style={{ transition: 'opacity 0.2s' }}
              />
            </div>
          ))}
        </div>

        {/* 하단 인디케이터 (2장 이상일 때만) */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {images.map((img, i) => (
              <div
                key={img.id}
                className={`rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'w-2 h-2 bg-accent'
                    : 'w-1.5 h-1.5 bg-surface-strong'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 전체화면 이미지 뷰어 */}
      <ImageFullscreenViewer
        images={images}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
