import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

// 앱 마운트 시 localStorage 토큰으로 인증 상태 확인
export function useAuth() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      return;
    }

    setLoading(true);
    authApi
      .getMe()
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, [setUser, setLoading]);
}
