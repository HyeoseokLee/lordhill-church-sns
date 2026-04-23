import { useParams } from 'react-router-dom';
import { Typography } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const targetUserId = userId || currentUser?.id;

  return (
    <div className="p-4">
      <Typography variant="h6" className="!font-bold">
        프로필
      </Typography>
      <p className="mt-2 text-sm text-gray-500">User ID: {targetUserId}</p>
      {/* TODO: Profile info + user's posts */}
    </div>
  );
}
