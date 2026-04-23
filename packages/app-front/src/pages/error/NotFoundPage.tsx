import { Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <Typography variant="h3" className="!font-bold text-gray-300">
        404
      </Typography>
      <Typography variant="body1" className="mt-2 text-gray-500">
        페이지를 찾을 수 없습니다
      </Typography>
      <Button variant="outlined" onClick={() => navigate('/')} className="!mt-6">
        홈으로
      </Button>
    </div>
  );
}
