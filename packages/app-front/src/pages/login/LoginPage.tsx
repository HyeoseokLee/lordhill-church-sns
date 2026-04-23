import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import axiosInstance from '@/api/axiosInstance';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/stores/authStore';

const OAUTH_PROVIDERS = [
  {
    name: 'Google',
    icon: <GoogleIcon />,
    url: '/api/auth/google',
    color: '#4285F4',
  },
  {
    name: 'Kakao',
    icon: null,
    url: '/api/auth/kakao',
    color: '#FEE500',
    textColor: '#000000',
  },
  {
    name: 'Naver',
    icon: null,
    url: '/api/auth/naver',
    color: '#03C75A',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [devLoading, setDevLoading] = useState(false);

  const handleLogin = (url: string) => {
    window.location.href = url;
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/dev-login');
      localStorage.setItem('accessToken', data.accessToken);
      const meRes = await authApi.getMe();
      setUser(meRes.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Dev login failed:', err);
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="mb-12 text-center">
        <Typography variant="h4" className="!font-bold text-green-800">
          주님의 언덕 교회
        </Typography>
        <Typography variant="body2" className="mt-2 text-gray-500">
          교회 가족 소통 공간
        </Typography>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {OAUTH_PROVIDERS.map((provider) => (
          <Button
            key={provider.name}
            variant="contained"
            fullWidth
            size="large"
            startIcon={provider.icon}
            onClick={() => handleLogin(provider.url)}
            sx={{
              backgroundColor: provider.color,
              color: provider.textColor || '#FFFFFF',
              '&:hover': {
                backgroundColor: provider.color,
                opacity: 0.9,
              },
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {provider.name}로 로그인
          </Button>
        ))}

        {import.meta.env.DEV && (
          <Button
            variant="outlined"
            fullWidth
            size="large"
            disabled={devLoading}
            onClick={handleDevLogin}
            sx={{
              mt: 2,
              borderColor: '#787878',
              color: '#464646',
              '&:hover': {
                borderColor: '#464646',
                backgroundColor: '#F5F5F5',
              },
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {devLoading ? '로그인 중...' : '\uD83D\uDD27 Dev Login'}
          </Button>
        )}
      </div>
    </div>
  );
}
