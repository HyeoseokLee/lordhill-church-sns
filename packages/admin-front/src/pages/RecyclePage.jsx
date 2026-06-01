import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import ImageViewerModal from '../components/ImageViewerModal';

export default function RecyclePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [viewImage, setViewImage] = useState(null);

  const fetchItems = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/recycles?page=${p}&limit=20`);
      setItems(data.items);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleConfirm = async () => {
    if (!deleteModal) return;
    try {
      const { type, id } = deleteModal;
      if (type === 'restore') {
        await api.patch(`/admin/recycles/${id}/restore`);
      } else if (type === 'recycle') {
        await api.delete(`/admin/recycles/${id}`);
        setExpandedId(null);
      } else if (type === 'permanentRecycle') {
        await api.delete(`/admin/recycles/${id}/permanent`);
        setExpandedId(null);
      } else if (type === 'comment') {
        await api.delete(`/admin/recycle-comments/${id}`);
      } else if (type === 'permanentComment') {
        await api.delete(`/admin/recycle-comments/${id}/permanent`);
      } else if (type === 'restoreComment') {
        await api.patch(`/admin/recycle-comments/${id}/restore`);
      }
      setDeleteModal(null);
      fetchItems(page);
    } catch {
      setDeleteModal(null);
      alert('처리에 실패했습니다.');
    }
  };

  const toggleExpand = id => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">공유글 관리</h2>

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
                제목
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                댓글
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                공유
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
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  공유글이 없습니다.
                </td>
              </tr>
            ) : (
              items.map(item => {
                const isDeleted = !!item.deletedAt;
                return (
                  <>
                    <tr
                      key={item.id}
                      className={`border-b cursor-pointer ${isDeleted ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      onClick={() => toggleExpand(item.id)}
                    >
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`}
                      >
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${isDeleted ? 'text-gray-300' : ''}`}
                      >
                        {item.user?.nickname || '익명'}
                      </td>
                      <td
                        className={`px-4 py-3 max-w-xs truncate ${isDeleted ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        {item.title}
                      </td>
                      <td
                        className={`px-4 py-3 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`}
                      >
                        {item.commentCount || 0}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 1 ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                            공유완료
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            공유전
                          </span>
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
                                setDeleteModal({ type: 'restore', id: item.id })
                              }
                              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            >
                              복구
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setDeleteModal({ type: 'recycle', id: item.id })
                              }
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                            >
                              삭제
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setDeleteModal({
                                type: 'permanentRecycle',
                                id: item.id,
                              })
                            }
                            className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black"
                          >
                            영구삭제
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedId === item.id && (
                      <tr key={`detail-${item.id}`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-4">
                          <div className="mb-4 flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-400 mb-1">
                                제목
                              </p>
                              <p className="text-sm font-bold text-gray-700">
                                {item.title}
                              </p>
                            </div>
                            {item.toUser && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium flex-shrink-0">
                                {item.toUser.nickname}에게 공유됨
                              </span>
                            )}
                          </div>
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-400 mb-1">
                              내용
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded p-3">
                              {item.content || '(내용 없음)'}
                            </p>
                          </div>

                          {/* 이미지 */}
                          {item.media?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-gray-400 mb-2">
                                이미지 ({item.media.length})
                              </p>
                              <div className="flex gap-2 overflow-x-auto">
                                {item.media.map(m => (
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

                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-2">
                              댓글 ({item.commentCount || 0})
                            </p>
                            {!item.comments || item.comments.length === 0 ? (
                              <p className="text-sm text-gray-400">
                                댓글이 없습니다.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {item.comments.map(comment => {
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => fetchItems(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded border text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchItems(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!deleteModal}
        message={
          {
            restore: '이 공유글을 복구하시겠습니까?\n댓글도 함께 복구됩니다.',
            restoreComment: '이 댓글을 복구하시겠습니까?',
            recycle:
              '이 공유글을 삭제하시겠습니까?\n댓글도 모두 삭제됩니다.\n관리자가 복구할 수 있습니다.',
            comment:
              '이 댓글을 삭제하시겠습니까?\n관리자가 복구할 수 있습니다.',
            permanentRecycle:
              '이 공유글을 영구삭제하시겠습니까?\n모든 데이터와 이미지가 완전히 삭제되며 복구할 수 없습니다.',
            permanentComment:
              '이 댓글을 영구삭제하시겠습니까?\n완전히 삭제되며 복구할 수 없습니다.',
          }[deleteModal?.type] || ''
        }
        confirmText={
          {
            restore: '복구',
            restoreComment: '복구',
            permanentRecycle: '영구삭제',
            permanentComment: '영구삭제',
          }[deleteModal?.type] || '삭제'
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
      <ImageViewerModal
        open={!!viewImage}
        imageUrl={viewImage}
        onClose={() => setViewImage(null)}
      />
    </div>
  );
}
