import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* 로그아웃 실패해도 로컬 토큰 삭제 진행 */
    }
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  // 접힌 상태의 아이콘 전용 링크 스타일
  const iconLinkClass = ({ isActive }) =>
    `flex items-center justify-center w-10 h-10 rounded-lg transition ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* 사이드바 */}
      <aside
        className={`bg-white border-r p-4 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-56'
        }`}
      >
        {/* 헤더: 관리자 + 토글 버튼 */}
        <div className="flex items-center justify-between mb-6 px-1">
          {!collapsed && <h1 className="text-lg font-bold px-3">관리자</h1>}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            title={collapsed ? '메뉴 열기' : '메뉴 닫기'}
          >
            {collapsed ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* 네비게이션 */}
        {collapsed ? (
          <nav className="space-y-1 flex-1 flex flex-col items-center">
            <NavLink to="/" end className={iconLinkClass} title="대시보드">
              <span className="text-base">📊</span>
            </NavLink>
            <NavLink to="/users" className={iconLinkClass} title="회원 관리">
              <span className="text-base">👥</span>
            </NavLink>
            <NavLink
              to="/content"
              className={iconLinkClass}
              title="게시글 관리"
            >
              <span className="text-base">📝</span>
            </NavLink>
            <NavLink
              to="/recycle"
              className={iconLinkClass}
              title="공유글 관리"
            >
              <span className="text-base">🐬</span>
            </NavLink>
            <NavLink
              to="/notices"
              className={iconLinkClass}
              title="공지사항 관리"
            >
              <span className="text-base">📢</span>
            </NavLink>
            <NavLink to="/push" className={iconLinkClass} title="푸시 관리">
              <span className="text-base">🔔</span>
            </NavLink>
            <NavLink to="/offering" className={iconLinkClass} title="헌금 관리">
              <span className="text-base">💰</span>
            </NavLink>
          </nav>
        ) : (
          <nav className="space-y-1 flex-1">
            <NavLink to="/" end className={linkClass}>
              대시보드
            </NavLink>
            <NavLink to="/users" className={linkClass}>
              회원 관리
            </NavLink>
            <NavLink to="/content" className={linkClass}>
              게시글 관리
            </NavLink>
            <NavLink to="/recycle" className={linkClass}>
              공유글 관리
            </NavLink>
            <NavLink to="/notices" className={linkClass}>
              공지사항 관리
            </NavLink>
            <NavLink to="/push" className={linkClass}>
              푸시 관리
            </NavLink>
            <NavLink to="/offering" className={linkClass}>
              헌금 관리
            </NavLink>
          </nav>
        )}

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className={`text-sm text-gray-400 hover:text-red-500 py-2 text-left ${
            collapsed ? 'flex justify-center' : 'px-4'
          }`}
          title="로그아웃"
        >
          {collapsed ? '🚪' : '로그아웃'}
        </button>
      </aside>

      {/* 메인 */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
