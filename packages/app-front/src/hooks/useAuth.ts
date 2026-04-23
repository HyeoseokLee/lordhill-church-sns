import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

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
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null));
  }, [setUser, setLoading]);
}
