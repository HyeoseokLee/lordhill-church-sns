import { Typography, Button } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';

export default function PendingPage() {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Typography variant="h5" className="!font-bold">
        승인 대기 중
      </Typography>
      <Typography variant="body1" className="mt-4 text-gray-600">
        관리자의 승인을 기다리고 있습니다.
        <br />
        승인이 완료되면 서비스를 이용하실 수 있습니다.
      </Typography>
      <Button variant="outlined" onClick={handleLogout} className="!mt-8" color="inherit">
        로그아웃
      </Button>
    </div>
  );
}
