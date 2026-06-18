import { HandHeart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import IcDolphin from '@/assets/icons/ic_dolphin.svg?react';
import IcStatistics from '@/assets/icons/ic_statistics.svg?react';

// 홈 아이콘 (currentColor 사용)
function IconHome({ size = 20 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M19.5216 6.27243L10.518 0.158767C10.205 -0.0529222 9.79545 -0.0529222 9.48482 0.158767L0.478841 6.27243C0.225735 6.44271 0.0761719 6.72803 0.0761719 7.03405V19.0796C0.0761719 19.5881 0.488045 20 0.996559 20H19.0039C19.5124 20 19.9243 19.5881 19.9243 19.0796V7.03405C19.9243 6.72803 19.7724 6.44501 19.5216 6.27243ZM8.59435 18.1592V13.7575C8.59435 12.9821 9.22482 12.3516 10.0002 12.3516C10.7757 12.3516 11.4061 12.9821 11.4061 13.7575V18.1592H8.59205H8.59435ZM18.0835 18.1592H13.2469V13.7575C13.2469 11.9673 11.7904 10.5108 10.0002 10.5108C8.21009 10.5108 6.75358 11.9673 6.75358 13.7575V18.1592H1.91695V7.52186L10.0002 2.03405L18.0835 7.52186V18.1592Z"
        fill="currentColor"
      />
    </svg>
  );
}

// 마이 아이콘 (currentColor 사용)
function IconMy({ size = 20 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M10.003 10.296C12.8424 10.296 15.1515 7.98691 15.1515 5.14751C15.1515 2.30812 12.8424 -0.000976562 10.003 -0.000976562C7.16358 -0.000976562 4.85449 2.30812 4.85449 5.14751C4.85449 7.98691 7.16358 10.296 10.003 10.296ZM10.003 1.90147C11.7937 1.90147 13.249 3.35684 13.249 5.14751C13.249 6.93819 11.7937 8.39356 10.003 8.39356C8.21231 8.39356 6.75694 6.93819 6.75694 5.14751C6.75694 3.35684 8.21231 1.90147 10.003 1.90147Z"
        fill="currentColor"
      />
      <path
        d="M12.2443 10.9756H7.75924C4.00905 10.9756 0.958008 14.0266 0.958008 17.7768V18.1074C0.958008 19.1513 1.80697 20.0003 2.85094 20.0003H17.1502C18.1941 20.0003 19.0431 19.1513 19.0431 18.1074V17.7768C19.0431 14.0266 15.9921 10.9756 12.2419 10.9756H12.2443ZM2.86045 18.1074V17.7768C2.86045 15.0754 5.05777 12.878 7.75924 12.878H12.2443C14.9457 12.878 17.143 15.0754 17.143 17.7768L17.1526 18.0979L2.86283 18.1074H2.86045Z"
        fill="currentColor"
      />
    </svg>
  );
}

// 돌고래 아이콘 (ic_dolphin.svg, fill 기반 + 약간의 stroke로 두께 보정)
function IconDolphin({ size = 20 }: { size?: number; strokeWidth?: number }) {
  const scaledSize = Math.round(size * 1.32);
  return (
    <IcDolphin
      width={scaledSize}
      height={scaledSize}
      stroke="currentColor"
      strokeWidth={6}
    />
  );
}

// 기도 아이콘 (HandHeart, 선 굵기 고정 — active 시 굵어지지 않도록)
function IconPrayer({ size = 20 }: { size?: number; strokeWidth?: number }) {
  return <HandHeart size={Math.round(size * 1.32)} strokeWidth={1.5} />;
}

// 통계 아이콘 (ic_statistics.svg, stroke 기반)
function IconStatistics({
  size = 20,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  const scaledSize = Math.round(size * 1.2);
  return <IcStatistics width={scaledSize} height={scaledSize} />;
}

// 하단 네비게이션 아이템 (홈, 돌고래/재활용, 기도, 통계, 마이페이지)
const navItems = [
  { path: '/feed', icon: IconHome, label: '홈' },
  { path: '/recycle', icon: IconDolphin, label: '돌고래' },
  { path: '/prayer', icon: IconPrayer, label: '기도' },
  { path: '/statistics', icon: IconStatistics, label: '통계' },
  { path: '/my', icon: IconMy, label: '마이' },
];

// 메인 탭 페이지 전용 하단 네비게이션 (각 WithOutlet에서 렌더링)
export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-bg pt-2 pb-1">
      {/* 아이콘 행 */}
      <div className="flex justify-around">
        {navItems.map(({ path, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center justify-center w-14 h-7 transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-text'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            </button>
          );
        })}
      </div>
      {/* 라벨 행 */}
      <div className="flex justify-around mt-[-2px]">
        {navItems.map(({ path, label }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-14 text-center text-[10px] font-medium transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
