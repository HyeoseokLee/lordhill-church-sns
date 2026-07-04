// 무지개 보더 TIP 안내 카드
export default function RainbowTipCard({ children }: { children: string }) {
  return (
    <div className="p-[1.5px] rounded-[16px] bg-[linear-gradient(90deg,#FF6B6B,#FFA94D,#FFD43B,#69DB7C,#4DABF7,#9775FA)]">
      <div className="bg-white rounded-[15px] flex items-center gap-3 px-4 py-3">
        <span className="flex-shrink-0 bg-accent text-white text-[12px] font-bold px-2.5 py-1 rounded-full">
          TIP
        </span>
        <p className="text-[13px] text-text font-medium leading-[1.5]">
          {children}
        </p>
      </div>
    </div>
  );
}
