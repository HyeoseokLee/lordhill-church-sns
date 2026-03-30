import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';
import PostCard from '../components/PostCard';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPost = async () => {
    try {
      const { data } = await api.get(`/posts/${id}`);
      setPost(data);
    } catch {
      navigate('/');
    }
  };

  const fetchComments = async () => {
    const { data } = await api.get(`/posts/${id}/comments`);
    setComments(data.comments);
  };

  useEffect(() => {
    Promise.all([fetchPost(), fetchComments()]).finally(() => setLoading(false));
  }, [id]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(`/posts/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.error || '댓글 작성에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await api.delete(`/comments/${commentId}`);
    fetchComments();
  };

  if (loading) return <div className="p-4 text-center text-gray-400">불러오는 중...</div>;
  if (!post) return null;

  return (
    <div className="max-w-lg mx-auto pb-20">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 mr-3">
          ←
        </button>
        <h1 className="text-lg font-bold">게시물</h1>
      </div>

      <PostCard post={post} onUpdate={fetchPost} showFull />

      {/* 댓글 목록 */}
      <div className="bg-white mt-2">
        <div className="px-4 py-3 border-b">
          <span className="font-medium">댓글 {comments.length}</span>
        </div>

        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            아직 댓글이 없습니다.
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="px-4 py-3 border-b last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {c.author.profileImageUrl ? (
                      <img src={c.author.profileImageUrl} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <span className="text-sm font-medium">{c.author.nickname || '익명'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {c.authorId === user?.id && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>
              <p className="text-sm mt-1 ml-9">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* 댓글 입력 */}
      <form
        onSubmit={handleSubmitComment}
        className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 flex gap-2 max-w-lg mx-auto"
      >
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          maxLength={500}
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="text-blue-600 font-medium text-sm disabled:text-gray-300"
        >
          게시
        </button>
      </form>
    </div>
  );
}
