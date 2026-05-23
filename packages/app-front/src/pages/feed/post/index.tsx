import { useParams } from 'react-router-dom';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';

// 게시글 상세 페이지 (피드의 자식)
export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <div className="scrollInner">
        <SubPageHeader title="게시글" />
        <div className="w-full">
          <p className="text-sm text-text-muted">Post ID: {postId}</p>
          {/* TODO: 게시글 상세 + 댓글 */}
        </div>
      </div>
    </FullHeightBox>
  );
}
