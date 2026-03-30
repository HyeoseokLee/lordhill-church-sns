import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import LoginPage from './pages/LoginPage';
import PendingPage from './pages/PendingPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import PostDetailPage from './pages/PostDetailPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.status === 'PENDING' || user.status === 'REJECTED') return <Navigate to="/pending" />;
  return children;
}

export default function App() {
  const { fetchUser, user, loading } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user && user.status === 'APPROVED' ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/posts/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
