import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

export function useAuth() {
  const { setUser, setLoading } = useAuthStore();

  // Bearer 토큰 또는 쿠키 기반 인증으로 사용자 정보 조회
  useEffect(() => {
    setLoading(true);
    authApi
      .getMe()
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, [setUser, setLoading]);
}
