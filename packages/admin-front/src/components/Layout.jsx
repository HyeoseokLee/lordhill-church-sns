import { NavLink, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Layout({ children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r p-4 flex flex-col">
        <h1 className="text-lg font-bold mb-6 px-4">관리자</h1>
        <nav className="space-y-1 flex-1">
          <NavLink to="/" end className={linkClass}>
            대시보드
          </NavLink>
          <NavLink to="/users" className={linkClass}>
            회원 관리
          </NavLink>
          <NavLink to="/content" className={linkClass}>
            컨텐츠 관리
          </NavLink>
        </nav>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-500 px-4 py-2 text-left"
        >
          로그아웃
        </button>
      </aside>

      {/* 메인 */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
