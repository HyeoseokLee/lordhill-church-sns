import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';

// 하단 네비게이션 아이템 (홈, 글쓰기, 프로필)
const navItems = [
  { path: '/', icon: 'home', activeIcon: 'home' },
  { path: '#write', icon: 'edit_square', activeIcon: 'edit_square' },
  { path: '/profile', icon: 'person', activeIcon: 'person' },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useUIStore(s => s.isBottomNavVisible);
  const setWriteDrawerOpen = useUIStore(s => s.setWriteDrawerOpen);

  if (!isVisible) return null;

  const handleClick = (path: string) => {
    if (path === '#write') {
      setWriteDrawerOpen(true);
      return;
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-bg">
      <div className="flex justify-around py-3">
        {navItems.map(({ path, icon, activeIcon }) => {
          const isActive = path !== '#write' && location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleClick(path)}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <span
                className="material-symbols-outlined text-[26px]"
                style={
                  isActive ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                {isActive ? activeIcon : icon}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
