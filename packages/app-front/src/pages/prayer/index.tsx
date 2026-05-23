// 기도 메인 페이지
export default function PrayerPage() {
  return (
    <>
      {/* 상단 헤더 */}
      <header className="w-full flex items-center justify-between py-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          기도
        </h1>
      </header>

      {/* 콘텐츠 영역 */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[15px] font-semibold text-text-muted mb-1">
          준비 중입니다
        </p>
        <p className="text-[13px] text-text-muted">
          기도 기능이 곧 추가됩니다.
        </p>
      </div>
    </>
  );
}
