// 돌고래(재활용/나눔) 메인 페이지
export default function RecyclePage() {
  return (
    <>
      {/* 상단 헤더 (고정, 스크롤 안 됨) */}
      <header className="w-full flex items-center justify-between py-4 px-5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          돌고래
        </h1>
      </header>

      {/* 스크롤 영역 */}
      <div className="scrollInner">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[15px] font-semibold text-text-muted mb-1">
            준비 중입니다
          </p>
          <p className="text-[13px] text-text-muted">
            재활용/나눔 기능이 곧 추가됩니다.
          </p>
        </div>
      </div>
    </>
  );
}
