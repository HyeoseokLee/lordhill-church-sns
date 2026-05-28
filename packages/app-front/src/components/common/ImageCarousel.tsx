import { useRef, useState } from 'react';

interface Props {
  images: { id: number; url: string }[];
}

// 이미지 캐러셀 (좌우 스와이프 + 하단 인디케이터 점)
export default function ImageCarousel({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤 위치로 현재 인덱스 계산
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setCurrentIndex(index);
  };

  if (images.length === 0) return null;

  return (
    <div className="mb-3">
      {/* 이미지 슬라이드 영역 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-[12px]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map(img => (
          <div
            key={img.id}
            className="w-full flex-shrink-0 snap-center bg-surface"
          >
            <img src={img.url} alt="" className="w-full h-auto" />
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
  );
}
