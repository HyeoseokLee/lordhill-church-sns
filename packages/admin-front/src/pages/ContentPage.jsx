import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ContentPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/posts?page=${p}&limit=20`);
      setPosts(data.items);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDeletePost = async postId => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/posts/${postId}`);
      fetchPosts(page);
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">게시글 관리</h2>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                날짜
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                작성자
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                내용
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                좋아요
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  게시글이 없습니다.
                </td>
              </tr>
            ) : (
              posts.map(post => (
                <tr
                  key={post.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {post.user?.nickname || '익명'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {post.content?.slice(0, 50) || '(내용 없음)'}
                    {post.content?.length > 50 ? '...' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {post.likeCount || 0}
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => fetchPosts(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded border text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchPosts(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
