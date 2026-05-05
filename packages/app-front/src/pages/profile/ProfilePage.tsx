import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const targetUserId = userId || currentUser?.id;
  const isMyProfile = !userId || userId === currentUser?.id;

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
    <div className="p-4">
      <Typography variant="h6" className="!font-bold">
        프로필
      </Typography>
      <p className="mt-2 text-sm text-gray-500">User ID: {targetUserId}</p>
      {/* TODO: Profile info + user's posts */}
      {isMyProfile && (
        <Button
          variant="outlined"
          fullWidth
          onClick={handleLogout}
          sx={{
            mt: 4,
            color: '#d32f2f',
            borderColor: '#d32f2f',
            '&:hover': {
              borderColor: '#b71c1c',
              backgroundColor: '#fce4ec',
            },
          }}
        >
          로그아웃
        </Button>
      )}
    </div>
  );
}
