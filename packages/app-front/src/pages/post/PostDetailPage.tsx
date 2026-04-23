import { useParams } from 'react-router-dom';
import { Typography } from '@mui/material';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();

  return (
    <div className="p-4">
      <Typography variant="h6" className="!font-bold">
        게시글 상세
      </Typography>
      <p className="mt-2 text-sm text-gray-500">Post ID: {postId}</p>
      {/* TODO: Post detail + comments */}
    </div>
  );
}
