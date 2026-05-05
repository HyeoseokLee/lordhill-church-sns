import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

// 로그인 후 랜딩 홈 페이지
export default function HomePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 서버 로그아웃 실패해도 클라이언트는 정리
    }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Typography variant="h4">Hello World</Typography>
      <Button variant="outlined" color="error" onClick={handleLogout}>
        Logout!
      </Button>
    </div>
  );
}
