import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './lib/api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ContentPage from './pages/ContentPage';
import PushPage from './pages/PushPage';
import RecyclePage from './pages/RecyclePage';
import OfferingPage from './pages/OfferingPage';
import OfferingRegisterPage from './pages/OfferingRegisterPage';
import FundRegisterPage from './pages/FundRegisterPage';
import NoticePage from './pages/NoticePage';
import MealPage from './pages/MealPage';

function AdminRoute({ children }) {
  const [state, setState] = useState({
    loading: true,
    isAdmin: false,
    role: null,
  });

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        const isAdmin =
          (data.role === 'admin' || data.role === 'sub_admin') &&
          data.status === 'approved';
        setState({ loading: false, isAdmin, role: data.role });
      })
      .catch(() => {
        setState({ loading: false, isAdmin: false, role: null });
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

  return <Layout role={state.role}>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/content"
          element={
            <AdminRoute>
              <ContentPage />
            </AdminRoute>
          }
        />
        <Route
          path="/push"
          element={
            <AdminRoute>
              <PushPage />
            </AdminRoute>
          }
        />
        <Route
          path="/recycle"
          element={
            <AdminRoute>
              <RecyclePage />
            </AdminRoute>
          }
        />
        <Route
          path="/offering"
          element={
            <AdminRoute>
              <OfferingPage />
            </AdminRoute>
          }
        />
        <Route
          path="/notices"
          element={
            <AdminRoute>
              <NoticePage />
            </AdminRoute>
          }
        />
        <Route
          path="/offering/register"
          element={
            <AdminRoute>
              <OfferingRegisterPage />
            </AdminRoute>
          }
        />
        <Route
          path="/offering/fund-register"
          element={
            <AdminRoute>
              <FundRegisterPage />
            </AdminRoute>
          }
        />
        <Route
          path="/meal"
          element={
            <AdminRoute>
              <MealPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
