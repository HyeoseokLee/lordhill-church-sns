import { useLocation, useNavigate } from 'react-router-dom';
import { Home, SquarePen, User } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

// 하단 네비게이션 아이템 (홈, 글쓰기, 프로필)
const navItems = [
  { path: '/', icon: Home },
  { path: '/posts/new', icon: SquarePen },
  { path: '/profile', icon: User },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useUIStore(s => s.isBottomNavVisible);

  if (!isVisible) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-bg">
      <div className="flex justify-around py-3">
        {navItems.map(({ path, icon: Icon }) => {
          const isActive = location.pathname === path;
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
