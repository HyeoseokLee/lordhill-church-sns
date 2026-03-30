import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './lib/api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ContentPage from './pages/ContentPage';

function AdminRoute({ children }) {
  const [state, setState] = useState({ loading: true, isAdmin: false });

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setState({ loading: false, isAdmin: data.role === 'ADMIN' && data.status === 'APPROVED' });
      })
      .catch(() => {
        setState({ loading: false, isAdmin: false });
      });
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (!state.isAdmin) return <Navigate to="/login" />;

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/content" element={<AdminRoute><ContentPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
