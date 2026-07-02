import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import api from '../lib/api';

const STATUS_LABELS = {
  pending: '대기',
  approved: '활성',
  rejected: '거절됨',
  deactivated: '잠금',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  deactivated: 'bg-gray-100 text-gray-800',
};

// 삭제된 유저인지 판별
const isDeleted = user => !!user.deletedAt;

// 상태 라벨 (삭제 포함)
const getStatusLabel = user => {
  if (isDeleted(user)) return '삭제됨';
  return STATUS_LABELS[user.status] || user.status;
};

// 상태 색상 (삭제 포함)
const getStatusColor = user => {
  if (isDeleted(user)) return 'bg-red-100 text-red-800';
  return STATUS_COLORS[user.status] || '';
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [blockDetailTarget, setBlockDetailTarget] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const { data } = await api.get('/admin/users', { params });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async userId => {
    if (!confirm('이 회원을 승인하시겠습니까?')) return;
    await api.patch(`/admin/users/${userId}/approve`);
    fetchUsers();
  };

  const handleReject = async userId => {
    if (!confirm('이 회원을 거절하시겠습니까?')) return;
    await api.patch(`/admin/users/${userId}/reject`);
    fetchUsers();
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    await api.patch(`/admin/users/${deactivateTarget.id}/deactivate`);
    setDeactivateTarget(null);
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/admin/users/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchUsers();
  };

  const handleRestore = async userId => {
    if (!confirm('이 회원의 계정을 복구하시겠습니까?')) return;
    await api.patch(`/admin/users/${userId}/restore`);
    fetchUsers();
  };

  const tabs = [
    { label: '전체', value: '' },
    { label: '대기', value: 'pending' },
    { label: '활성', value: 'approved' },
    { label: '잠금', value: 'deactivated' },
    { label: '삭제됨', value: 'deleted' },
    { label: '거절됨', value: 'rejected' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">회원 관리</h2>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                회원
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                이메일
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                OAuth
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                상태
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                차단
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                가입일
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">
                액션
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  회원이 없습니다.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <>
                  {/* 회원 행 */}
                  <tr
                    key={user.id}
                    className={`border-b last:border-0 cursor-pointer ${
                      isDeleted(user) ? 'opacity-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() =>
                      setExpandedId(expandedId === user.id ? null : user.id)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xs font-bold">
                              {(user.nickname || '?').charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium">
                          {user.nickname || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">
                      {user.provider}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user)}`}
                      >
                        {getStatusLabel(user)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.blockedByCount > 0 ? (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setBlockDetailTarget(user);
                          }}
                          className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-medium hover:bg-orange-200 transition-colors"
                        >
                          {user.blockedByCount}명
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex gap-2">
                        {isDeleted(user) && (
                          <button
                            onClick={() => handleRestore(user.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            삭제복구
                          </button>
                        )}
                        {!isDeleted(user) && user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                            >
                              거절
                            </button>
                          </>
                        )}
                        {!isDeleted(user) &&
                          user.role !== 'admin' &&
                          user.status !== 'pending' && (
                            <>
                              <button
                                onClick={() => setDeactivateTarget(user)}
                                className={`px-3 py-1 rounded text-xs ${
                                  user.status === 'deactivated'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                              >
                                {user.status === 'deactivated'
                                  ? '잠금해제'
                                  : '계정잠금'}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(user)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                삭제
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>

                  {/* 아코디언 상세 */}
                  {expandedId === user.id && (
                    <tr key={`detail-${user.id}`}>
                      <td colSpan={7} className="bg-gray-50 px-6 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                          {/* 프로필 이미지 */}
                          <div className="col-span-2 flex items-center gap-4 mb-2">
                            {user.profileImageUrl ? (
                              <img
                                src={user.profileImageUrl}
                                alt=""
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xl font-bold">
                                  {(user.nickname || '?').charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-lg font-bold text-gray-800">
                                {user.nickname || '-'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400">ID</p>
                            <p className="text-sm text-gray-700">{user.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">역할</p>
                            <p className="text-sm text-gray-700">{user.role}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              OAuth 제공자
                            </p>
                            <p className="text-sm text-gray-700 capitalize">
                              {user.provider}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">상태</p>
                            <p className="text-sm">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user)}`}
                              >
                                {getStatusLabel(user)}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">가입일</p>
                            <p className="text-sm text-gray-700">
                              {new Date(user.createdAt).toLocaleString('ko-KR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              차단당한 횟수
                            </p>
                            <p className="text-sm text-gray-700">
                              {user.blockedByCount || 0}명
                            </p>
                          </div>
                          {user.deletedAt && (
                            <div>
                              <p className="text-xs text-gray-400">삭제일</p>
                              <p className="text-sm text-red-600">
                                {new Date(user.deletedAt).toLocaleString(
                                  'ko-KR',
                                )}
                              </p>
                            </div>
                          )}
                          {user.profileImageUrl && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-400">
                                프로필 이미지 URL
                              </p>
                              <p className="text-xs text-gray-500 break-all">
                                {user.profileImageUrl}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 계정잠금/해제 확인 모달 */}
      <Dialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
      >
        <DialogTitle>
          {deactivateTarget?.status === 'deactivated'
            ? '계정 잠금해제'
            : '계정 잠금'}
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-700">
            <strong>
              {deactivateTarget?.nickname || deactivateTarget?.email}
            </strong>{' '}
            회원의 계정을{' '}
            {deactivateTarget?.status === 'deactivated' ? '잠금해제' : '잠금'}
            하시겠습니까?
          </p>
          {deactivateTarget?.status !== 'deactivated' && (
            <p className="text-sm text-yellow-600 mt-2">
              잠금된 회원은 소셜 로그인이 차단됩니다.
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateTarget(null)} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleDeactivate}
            color={
              deactivateTarget?.status === 'deactivated' ? 'primary' : 'warning'
            }
            variant="contained"
          >
            {deactivateTarget?.status === 'deactivated' ? '잠금해제' : '잠금'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 회원 삭제 확인 모달 */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>회원 삭제</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-700">
            <strong>{deleteTarget?.nickname || deleteTarget?.email}</strong>{' '}
            회원을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-red-600 mt-2">
            삭제된 회원은 소셜 로그인이 차단되며, 어드민에서 삭제복구할 수
            있습니다.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            취소
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 차단 상세 모달 */}
      <Dialog
        open={!!blockDetailTarget}
        onClose={() => setBlockDetailTarget(null)}
      >
        <DialogTitle>
          {blockDetailTarget?.nickname || blockDetailTarget?.email}님을 차단한
          사용자
        </DialogTitle>
        <DialogContent>
          {blockDetailTarget?.blockedBy?.length > 0 ? (
            <div className="space-y-2">
              {blockDetailTarget.blockedBy.map(blocker => (
                <div
                  key={blocker.id}
                  className="flex items-center gap-2 py-1.5"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {blocker.nickname || '익명'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">차단 내역이 없습니다.</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDetailTarget(null)} color="inherit">
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
