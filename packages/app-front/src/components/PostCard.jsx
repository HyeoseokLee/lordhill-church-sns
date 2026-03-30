import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export default function PostCard({ post, onUpdate, showFull = false }) {
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [expanded, setExpanded] = useState(showFull);

  const isLong = post.content.length > 200;
  const displayContent = expanded || !isLong ? post.content : post.content.slice(0, 200) + '...';

  const handleLike = async () => {
    try {
      const { data } = await api.post(`/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount((prev) => prev + (data.liked ? 1 : -1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      onUpdate?.();
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const images = post.media?.filter((m) => m.mediaType === 'IMAGE') || [];
  const videos = post.media?.filter((m) => m.mediaType === 'VIDEO') || [];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* 작성자 정보 */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {post.author.profileImageUrl ? (
              <img src={post.author.profileImageUrl} className="w-10 h-10 object-cover" />
            ) : (
              <span className="text-gray-400">👤</span>
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{post.author.nickname || '익명'}</p>
            <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {post.authorId === user?.id && (
          <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500">
            삭제
          </button>
        )}
      </div>

      {/* 본문 */}
      {post.content && (
        <div className="px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
          {isLong && !expanded && (
            <button onClick={() => setExpanded(true)} className="text-blue-500 text-sm mt-1">
              더보기
            </button>
          )}
        </div>
      )}

      {/* 이미지 */}
      {images.length > 0 && (
        <div
          className={`grid gap-0.5 ${
            images.length === 1
              ? 'grid-cols-1'
              : images.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2'
          }`}
        >
          {images.slice(0, 4).map((img, i) => (
            <div key={img.id} className="relative aspect-square">
              <img src={img.url} className="w-full h-full object-cover" alt="" />
              {i === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                  +{images.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 동영상 */}
      {videos.length > 0 &&
        videos.map((v) => (
          <div key={v.id} className="bg-black">
            <video
              src={v.url}
              controls
              muted
              className="w-full max-h-96 object-contain"
            />
          </div>
        ))}

      {/* 리액션 바 */}
      <div className="flex items-center gap-4 px-4 py-3 border-t text-sm text-gray-500">
        <button onClick={handleLike} className={`flex items-center gap-1 ${liked ? 'text-red-500' : ''}`}>
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <Link to={`/posts/${post.id}`} className="flex items-center gap-1">
          💬 {post._count?.comments || 0}
        </Link>
      </div>
    </div>
  );
}
