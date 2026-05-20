import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import api from '../lib/api';

export default function PushPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [sendLoading, setSendLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  // 푸시 보내기 폼 상태
  const [formData, setFormData] = useState({
    targetType: 'all', // all | user
    userId: '',
    title: '',
    body: '',
  });

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/push/logs', {
        params: { page: p, limit: 10 },
      });
      setLogs(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleOpenDialog = () => {
    fetchUsers();
    setFormData({ targetType: 'all', userId: '', title: '', body: '' });
    setResultMessage(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setResultMessage(null);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendPush = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    if (formData.targetType === 'user' && !formData.userId) {
      alert('대상 유저를 선택해주세요.');
      return;
    }

    setSendLoading(true);
    setResultMessage(null);
    try {
      const payload = {
        title: formData.title,
        body: formData.body,
      };
      if (formData.targetType === 'user' && formData.userId) {
        payload.userId = Number(formData.userId);
      }

      const { data } = await api.post('/admin/push/send', payload);
      const success = data.successCount ?? 0;
      const failure = data.failureCount ?? 0;
      setResultMessage({
        type: 'success',
        text: `전송 완료 — 성공: ${success}건, 실패: ${failure}건`,
      });
      setPage(1);
      fetchLogs(1);
    } catch (err) {
      console.error(err);
      setResultMessage({
        type: 'error',
        text: err.response?.data?.message || '푸시 전송에 실패했습니다.',
      });
    } finally {
      setSendLoading(false);
    }
  };

  const truncateContent = (text, length = 30) => {
    if (!text) return '-';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = status => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = status => {
    switch (status) {
      case 'sent':
        return '성공';
      case 'failed':
        return '실패';
      case 'scheduled':
        return '예약됨';
      default:
        return status || '-';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">푸시 관리</h2>
        <button
          onClick={handleOpenDialog}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          푸시 보내기
        </button>
      </div>

      {/* 푸시 이력 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                전송일시
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                대상
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                제목
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                내용
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                상태
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                성공/실패
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  보낸 푸시가 없습니다.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr
                  key={log.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.targetType === 'all'
                      ? '전체'
                      : log.targetUser?.nickname || '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {truncateContent(log.body)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}
                    >
                      {getStatusLabel(log.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="text-green-700">
                      {log.successCount ?? 0}
                    </span>
                    {' / '}
                    <span className="text-red-600">
                      {log.failureCount ?? 0}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded text-sm bg-white border text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                page === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded text-sm bg-white border text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {/* 푸시 보내기 Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>푸시 보내기</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            {/* 대상 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                대상
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() =>
                    handleFormChange('targetType', 'all') ||
                    handleFormChange('userId', '')
                  }
                  className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                    formData.targetType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  전체 회원
                </button>
                <button
                  onClick={() => handleFormChange('targetType', 'user')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                    formData.targetType === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  특정 유저
                </button>
              </div>
              {formData.targetType === 'user' && (
                <select
                  value={formData.userId}
                  onChange={e => handleFormChange('userId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">유저를 선택하세요</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nickname || user.email} ({user.provider})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => handleFormChange('title', e.target.value)}
                placeholder="푸시 알림 제목"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                value={formData.body}
                onChange={e => handleFormChange('body', e.target.value)}
                placeholder="푸시 알림 내용"
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 전송 결과 메시지 */}
            {resultMessage && (
              <div
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  resultMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {resultMessage.text}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleSendPush}
            color="primary"
            variant="contained"
            disabled={sendLoading}
          >
            {sendLoading ? '전송중...' : '보내기'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
