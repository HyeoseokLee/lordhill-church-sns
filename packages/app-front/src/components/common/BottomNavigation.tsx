import { useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import PersonIcon from '@mui/icons-material/Person';
import { useUIStore } from '@/stores/uiStore';

const navItems = [
  { path: '/', icon: HomeIcon, label: '홈' },
  { path: '/posts/new', icon: AddCircleOutlineIcon, label: '글쓰기' },
  { path: '/profile', icon: PersonIcon, label: '프로필' },
];

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useUIStore((s) => s.isBottomNavVisible);

  if (!isVisible) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-200 bg-white">
      <div className="flex justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
                isActive ? 'text-green-700' : 'text-gray-400'
              }`}
            >
              <Icon fontSize="small" />
              <span className="text-xs">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
