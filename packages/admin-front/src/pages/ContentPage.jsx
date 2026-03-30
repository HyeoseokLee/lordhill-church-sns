import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ContentPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/posts');
      setPosts(data.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDeletePost = async (postId) => {
    if (!confirm('이 포스트를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/posts/${postId}`);
      fetchPosts();
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">컨텐츠 관리</h2>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">작성자</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">내용</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">미디어</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">반응</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">작성일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  게시물이 없습니다.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">{post.author?.nickname || '익명'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {post.content?.slice(0, 50) || '(내용 없음)'}
                    {post.content?.length > 50 ? '...' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {post.media?.length > 0 ? `${post.media.length}개` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    ♡ {post._count?.likes || 0} · 💬 {post._count?.comments || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
