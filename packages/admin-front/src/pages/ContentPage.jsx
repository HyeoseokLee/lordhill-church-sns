import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import ImageViewerModal from '../components/ImageViewerModal';

// 신고 사유 레이블
const reasonLabel = {
  spam: '스팸/광고',
  abuse: '욕설/비방',
  inappropriate: '부적절한 콘텐츠',
  other: '기타',
};

export default function ContentPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  // 삭제 확인 모달 상태
  const [deleteModal, setDeleteModal] = useState(null);
  const [viewImage, setViewImage] = useState(null);

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
      } else if (deleteModal.type === 'permanentPost') {
        await api.delete(`/admin/posts/${deleteModal.id}/permanent`);
        setExpandedId(null);
      } else if (deleteModal.type === 'comment') {
        await api.delete(`/admin/comments/${deleteModal.id}`);
      } else if (deleteModal.type === 'permanentComment') {
        await api.delete(`/admin/comments/${deleteModal.id}/permanent`);
      } else if (deleteModal.type === 'restoreComment') {
        await api.patch(`/admin/comments/${deleteModal.id}/restore`);
      } else if (deleteModal.type === 'dismissReport') {
        await api.patch(`/admin/reports/${deleteModal.id}/dismiss`);
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
                신고
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
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
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
                        {post.reportCount > 0 ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-medium">
                            {post.reportCount}건
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
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
                        <div className="flex gap-1">
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
                          <button
                            onClick={() =>
                              setDeleteModal({
                                type: 'permanentPost',
                                id: post.id,
                              })
                            }
                            className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black"
                          >
                            영구삭제
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 아코디언 상세 영역 */}
                    {expandedId === post.id && (
                      <tr key={`detail-${post.id}`}>
                        <td colSpan={8} className="bg-gray-50 px-6 py-4">
                          {/* 게시글 전문 */}
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-400 mb-1">
                              게시글 전문
                            </p>
                            <div className="bg-white rounded p-3">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {post.content || '(내용 없음)'}
                              </p>
                              {/* 게시글 신고 내역 */}
                              {post.reports?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-[10px] font-medium text-orange-500 mb-2">
                                    신고 {post.reports.length}건
                                  </p>
                                  <div className="space-y-1.5">
                                    {post.reports.map(report => (
                                      <div
                                        key={report.id}
                                        className={`flex items-start justify-between ${report.status === 'dismissed' ? 'opacity-40' : ''}`}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-medium text-gray-600">
                                              {report.reporter?.nickname ||
                                                '익명'}
                                            </span>
                                            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px]">
                                              {reasonLabel[report.reason] ||
                                                report.reason}
                                            </span>
                                            {report.status === 'dismissed' && (
                                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">
                                                기각됨
                                              </span>
                                            )}
                                            <span className="text-[10px] text-gray-400">
                                              {new Date(
                                                report.createdAt,
                                              ).toLocaleDateString('ko-KR')}
                                            </span>
                                          </div>
                                          {report.detail && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              {report.detail}
                                            </p>
                                          )}
                                        </div>
                                        {report.status === 'pending' && (
                                          <button
                                            onClick={() =>
                                              setDeleteModal({
                                                type: 'dismissReport',
                                                id: report.id,
                                              })
                                            }
                                            className="ml-2 px-2 py-0.5 bg-gray-500 text-white rounded text-[10px] hover:bg-gray-600 flex-shrink-0"
                                          >
                                            기각
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 이미지 */}
                          {post.media?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-gray-400 mb-2">
                                이미지 ({post.media.length})
                              </p>
                              <div className="flex gap-2 overflow-x-auto">
                                {post.media.map(m => (
                                  <img
                                    key={m.id}
                                    src={m.url}
                                    alt=""
                                    onClick={() => setViewImage(m.url)}
                                    className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 flex-shrink-0"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

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
                                      className="bg-white rounded p-3"
                                    >
                                      <div className="flex items-start justify-between">
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
                                            {comment.reportCount > 0 && (
                                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-medium">
                                                신고 {comment.reportCount}건
                                              </span>
                                            )}
                                          </div>
                                          <p
                                            className={`text-sm whitespace-pre-wrap ${commentDeleted ? 'text-gray-300' : 'text-gray-600'}`}
                                          >
                                            {comment.content}
                                          </p>
                                        </div>
                                        <div className="ml-3 flex gap-1 flex-shrink-0">
                                          {commentDeleted ? (
                                            !isDeleted && (
                                              <button
                                                onClick={() =>
                                                  setDeleteModal({
                                                    type: 'restoreComment',
                                                    id: comment.id,
                                                  })
                                                }
                                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
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
                                              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                            >
                                              삭제
                                            </button>
                                          )}
                                          <button
                                            onClick={() =>
                                              setDeleteModal({
                                                type: 'permanentComment',
                                                id: comment.id,
                                              })
                                            }
                                            className="px-2 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black"
                                          >
                                            영구삭제
                                          </button>
                                        </div>
                                      </div>
                                      {/* 댓글 신고 내역 */}
                                      {comment.reports?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                          <p className="text-[10px] font-medium text-orange-500 mb-1.5">
                                            신고 {comment.reports.length}건
                                          </p>
                                          <div className="space-y-1">
                                            {comment.reports.map(report => (
                                              <div
                                                key={report.id}
                                                className={`flex items-center ${report.status === 'dismissed' ? 'opacity-40' : ''}`}
                                              >
                                                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                                  <span className="text-xs font-medium text-gray-600">
                                                    {report.reporter
                                                      ?.nickname || '익명'}
                                                  </span>
                                                  <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px]">
                                                    {reasonLabel[
                                                      report.reason
                                                    ] || report.reason}
                                                  </span>
                                                  {report.status ===
                                                    'dismissed' && (
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px]">
                                                      기각됨
                                                    </span>
                                                  )}
                                                  {report.detail && (
                                                    <span className="text-xs text-gray-500">
                                                      — {report.detail}
                                                    </span>
                                                  )}
                                                </div>
                                                {report.status ===
                                                  'pending' && (
                                                  <button
                                                    onClick={() =>
                                                      setDeleteModal({
                                                        type: 'dismissReport',
                                                        id: report.id,
                                                      })
                                                    }
                                                    className="px-2 py-0.5 bg-gray-500 text-white rounded text-[10px] hover:bg-gray-600 flex-shrink-0"
                                                  >
                                                    기각
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
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
          {
            restore: '이 게시글을 복구하시겠습니까?\n댓글도 함께 복구됩니다.',
            restoreComment: '이 댓글을 복구하시겠습니까?',
            post: '이 게시글을 삭제하시겠습니까?\n좋아요와 댓글도 모두 삭제됩니다.\n관리자가 복구할 수 있습니다.',
            comment:
              '이 댓글을 삭제하시겠습니까?\n관리자가 복구할 수 있습니다.',
            permanentPost:
              '이 게시글을 영구삭제하시겠습니까?\n모든 데이터와 이미지가 완전히 삭제되며 복구할 수 없습니다.',
            permanentComment:
              '이 댓글을 영구삭제하시겠습니까?\n완전히 삭제되며 복구할 수 없습니다.',
            dismissReport:
              '이 신고를 기각하시겠습니까?\n문제없는 콘텐츠로 판단합니다.',
          }[deleteModal?.type] || ''
        }
        confirmText={
          {
            restore: '복구',
            restoreComment: '복구',
            permanentPost: '영구삭제',
            permanentComment: '영구삭제',
            dismissReport: '기각',
          }[deleteModal?.type] || '삭제'
        }
        confirmColor={
          deleteModal?.type === 'restore' ||
          deleteModal?.type === 'restoreComment' ||
          deleteModal?.type === 'dismissReport'
            ? 'blue'
            : 'red'
        }
        onConfirm={handleConfirm}
        onCancel={() => setDeleteModal(null)}
      />
      <ImageViewerModal
        open={!!viewImage}
        imageUrl={viewImage}
        onClose={() => setViewImage(null)}
      />
    </div>
  );
}
