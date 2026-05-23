import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Recycle, HandHeart, User } from 'lucide-react';

// 하단 네비게이션 아이템 (홈, 돌고래/재활용, 기도, 마이페이지)
const navItems = [
  { path: '/feed', icon: Home },
  { path: '/recycle', icon: Recycle },
  { path: '/prayer', icon: HandHeart },
  { path: '/my', icon: User },
];

// 메인 탭 페이지 전용 하단 네비게이션 (각 WithOutlet에서 렌더링)
export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-bg h-[50px]">
      <div className="flex justify-around">
        {navItems.map(({ path, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
