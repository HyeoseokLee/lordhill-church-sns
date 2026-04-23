import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      authApi
        .getMe()
        .then((res) => {
          setUser(res.data.user);
          if (res.data.user.role === 'PENDING') {
            navigate('/login/pending', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        })
        .catch(() => {
          navigate('/login', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-500">로그인 처리 중...</div>
    </div>
  );
}
