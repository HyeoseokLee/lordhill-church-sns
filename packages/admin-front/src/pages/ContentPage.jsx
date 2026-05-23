import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';

export default function ContentPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  // 삭제 확인 모달 상태
  const [deleteModal, setDeleteModal] = useState(null);

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

  const handleConfirm = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'restore') {
        await api.patch(`/admin/posts/${deleteModal.id}/restore`);
      } else if (deleteModal.type === 'post') {
        await api.delete(`/admin/posts/${deleteModal.id}`);
        setExpandedId(null);
      } else if (deleteModal.type === 'comment') {
        await api.delete(`/admin/comments/${deleteModal.id}`);
      } else if (deleteModal.type === 'restoreComment') {
        await api.patch(`/admin/comments/${deleteModal.id}/restore`);
      }
      setDeleteModal(null);
      fetchPosts(page);
    } catch {
      setDeleteModal(null);
      alert('처리에 실패했습니다.');
    }
  };

  const toggleExpand = postId => {
    setExpandedId(expandedId === postId ? null : postId);
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
                댓글
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                상태
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  게시글이 없습니다.
                </td>
              </tr>
            ) : (
              posts.map(post => {
                const isDeleted = !!post.deletedAt;
                return (
                  <>
                    {/* 게시글 행 */}
                    <tr
                      key={post.id}
                      className={`border-b cursor-pointer ${isDeleted ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      onClick={() => toggleExpand(post.id)}
                    >
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`}
                      >
                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isDeleted ? 'text-gray-300' : ''}`}
                      >
                        {post.user?.nickname || '익명'}
                      </td>
                      <td
                        className={`px-4 py-3 max-w-xs truncate ${isDeleted ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        {post.content?.slice(0, 50) || '(내용 없음)'}
                        {post.content?.length > 50 ? '...' : ''}
                      </td>
                      <td
                        className={`px-4 py-3 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`}
                      >
                        {post.likeCount || 0}
                      </td>
                      <td
                        className={`px-4 py-3 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`}
                      >
                        {post.commentCount || 0}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">
                            삭제
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            활성
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={e => e.stopPropagation()}
                      >
                        {isDeleted ? (
                          <button
                            onClick={() =>
                              setDeleteModal({ type: 'restore', id: post.id })
                            }
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            복구
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setDeleteModal({ type: 'post', id: post.id })
                            }
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* 아코디언 상세 영역 */}
                    {expandedId === post.id && (
                      <tr key={`detail-${post.id}`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-4">
                          {/* 게시글 전문 */}
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-400 mb-1">
                              게시글 전문
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded p-3">
                              {post.content || '(내용 없음)'}
                            </p>
                          </div>

                          {/* 댓글 목록 */}
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-2">
                              댓글 ({post.commentCount || 0})
                            </p>
                            {!post.comments || post.comments.length === 0 ? (
                              <p className="text-sm text-gray-400">
                                댓글이 없습니다.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {post.comments.map(comment => {
                                  const commentDeleted = !!comment.deletedAt;
                                  return (
                                    <div
                                      key={comment.id}
                                      className="flex items-start justify-between bg-white rounded p-3"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className={`text-sm font-medium ${commentDeleted ? 'text-gray-300' : 'text-gray-700'}`}
                                          >
                                            {comment.user?.nickname || '익명'}
                                          </span>
                                          <span
                                            className={`text-xs ${commentDeleted ? 'text-gray-300' : 'text-gray-400'}`}
                                          >
                                            {new Date(
                                              comment.createdAt,
                                            ).toLocaleDateString('ko-KR')}
                                          </span>
                                          {commentDeleted ? (
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-medium">
                                              삭제
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                              활성
                                            </span>
                                          )}
                                        </div>
                                        <p
                                          className={`text-sm whitespace-pre-wrap ${commentDeleted ? 'text-gray-300' : 'text-gray-600'}`}
                                        >
                                          {comment.content}
                                        </p>
                                      </div>
                                      {commentDeleted ? (
                                        !isDeleted && (
                                          <button
                                            onClick={() =>
                                              setDeleteModal({
                                                type: 'restoreComment',
                                                id: comment.id,
                                              })
                                            }
                                            className="ml-3 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex-shrink-0"
                                          >
                                            복구
                                          </button>
                                        )
                                      ) : (
                                        <button
                                          onClick={() =>
                                            setDeleteModal({
                                              type: 'comment',
                                              id: comment.id,
                                            })
                                          }
                                          className="ml-3 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex-shrink-0"
                                        >
                                          삭제
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
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

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={!!deleteModal}
        message={
          deleteModal?.type === 'restore'
            ? '이 게시글을 복구하시겠습니까?\n댓글도 함께 복구됩니다.'
            : deleteModal?.type === 'restoreComment'
              ? '이 댓글을 복구하시겠습니까?'
              : deleteModal?.type === 'post'
                ? '이 게시글을 삭제하시겠습니까?\n좋아요와 댓글도 모두 삭제됩니다.'
                : '이 댓글을 삭제하시겠습니까?'
        }
        confirmText={
          deleteModal?.type === 'restore' ||
          deleteModal?.type === 'restoreComment'
            ? '복구'
            : '삭제'
        }
        confirmColor={
          deleteModal?.type === 'restore' ||
          deleteModal?.type === 'restoreComment'
            ? 'blue'
            : 'red'
        }
        onConfirm={handleConfirm}
        onCancel={() => setDeleteModal(null)}
      />
    </div>
  );
}
