import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import toast from 'react-hot-toast';
import api from '../lib/api';

// 카테고리 한쪽 패널 (입금 또는 출금)
function CategoryPanel({ title, type, items, loading, onRefresh }) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await api.post('/admin/transaction-categories', {
        name: newName.trim(),
        type,
      });
      setNewName('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async id => {
    if (!editingName.trim()) return;
    try {
      await api.patch(`/admin/transaction-categories/${id}`, {
        name: editingName.trim(),
      });
      setEditingId(null);
      setEditingName('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/transaction-categories/${id}`);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {/* 등록 폼 */}
      <div className="flex gap-2 mb-3 items-end">
        <TextField
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          label="카테고리명"
          placeholder="이름 입력"
          size="small"
          fullWidth
          variant="outlined"
        />
        <button
          onClick={handleCreate}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition whitespace-nowrap h-10"
        >
          등록
        </button>
      </div>

      {/* 리스트 */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-3">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">
          등록된 카테고리가 없습니다.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-3 py-2 ${
                idx !== items.length - 1 ? 'border-b' : ''
              } hover:bg-gray-50`}
            >
              {editingId === item.id ? (
                <TextField
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUpdate(item.id);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditingName('');
                    }
                  }}
                  onBlur={() => handleUpdate(item.id)}
                  autoFocus
                  size="small"
                  variant="outlined"
                  sx={{ flex: 1 }}
                />
              ) : (
                <span className="text-sm text-gray-800">{item.name}</span>
              )}
              <div className="flex items-center gap-1 ml-2">
                {editingId !== item.id && (
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingName(item.name);
                    }}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    수정
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          {items.length}개
        </p>
      )}
    </div>
  );
}

// 헌금 관리 리스트 페이지 + 입출금자/카테고리 관리 다이얼로그
export default function OfferingPage() {
  const navigate = useNavigate();

  // 입출금자 관리 상태
  const [donorDialogOpen, setDonorDialogOpen] = useState(false);
  const [donors, setDonors] = useState([]);
  const [donorNewName, setDonorNewName] = useState('');
  const [donorLoading, setDonorLoading] = useState(false);
  const [donorEditingId, setDonorEditingId] = useState(null);
  const [donorEditingName, setDonorEditingName] = useState('');
  const [donorCreating, setDonorCreating] = useState(false);

  // 카테고리 관리 상태
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  // 탭 상태 (헌금 / 울타리기금)
  const [activeTab, setActiveTab] = useState('offering');

  // 헌금 거래내역 리스트 상태
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(0);
  const TX_LIMIT = 20;

  // 울타리기금 거래내역 리스트 상태
  const [fundTransactions, setFundTransactions] = useState([]);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundPage, setFundPage] = useState(1);
  const [fundTotal, setFundTotal] = useState(0);
  const [fundTotalPages, setFundTotalPages] = useState(0);

  // 헌금 거래내역 조회
  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const { data } = await api.get(
        `/admin/transactions?page=${page}&limit=${TX_LIMIT}`,
      );
      setTransactions(data.items);
      setTxTotal(data.total);
      setTxTotalPages(data.totalPages);
      setTxPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  // 울타리기금 거래내역 조회
  const fetchFundTransactions = useCallback(async (page = 1) => {
    setFundLoading(true);
    try {
      const { data } = await api.get(
        `/admin/fund-transactions?page=${page}&limit=${TX_LIMIT}`,
      );
      setFundTransactions(data.items);
      setFundTotal(data.total);
      setFundTotalPages(data.totalPages);
      setFundPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setFundLoading(false);
    }
  }, []);

  // 인라인 수정 상태 (헌금/울타리 공용)
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingTxType, setEditingTxType] = useState(null); // 'offering' | 'fund'
  const [editCounterpartyId, setEditCounterpartyId] = useState(null);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // 인라인 수정 시작
  const startEdit = (tx, txType) => {
    setEditingTxId(tx.id);
    setEditingTxType(txType);
    setEditCounterpartyId(tx.counterparty?.id || null);
    setEditCategoryId(tx.category?.id || null);
  };

  // 인라인 수정 취소
  const cancelEdit = () => {
    setEditingTxId(null);
    setEditingTxType(null);
  };

  // 인라인 수정 저장
  const saveEdit = async () => {
    if (editSaving) return;
    setEditSaving(true);
    try {
      const endpoint =
        editingTxType === 'fund'
          ? `/admin/fund-transactions/${editingTxId}`
          : `/admin/transactions/${editingTxId}`;
      await api.patch(endpoint, {
        counterpartyId: editCounterpartyId,
        categoryId: editCategoryId,
      });
      toast.success('수정 완료');
      cancelEdit();
      if (editingTxType === 'fund') {
        fetchFundTransactions(fundPage);
      } else {
        fetchTransactions(txPage);
      }
    } catch (err) {
      console.error(err);
      toast.error('수정 실패');
    } finally {
      setEditSaving(false);
    }
  };

  // 카테고리 옵션 필터 (입금/출금 타입별)
  const getCategoryOptions = type => categories.filter(c => c.type === type);

  useEffect(() => {
    fetchTransactions(1);
    fetchFundTransactions(1);
    // 인라인 수정용 입출금자/카테고리 미리 조회
    fetchDonors();
    fetchCategories();
  }, [fetchTransactions, fetchFundTransactions]);

  // --- 입출금자 CRUD ---
  const fetchDonors = async () => {
    setDonorLoading(true);
    try {
      const { data } = await api.get('/admin/counterparties');
      setDonors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDonorLoading(false);
    }
  };

  const handleDonorCreate = async () => {
    if (!donorNewName.trim() || donorCreating) return;
    setDonorCreating(true);
    try {
      await api.post('/admin/counterparties', { name: donorNewName.trim() });
      setDonorNewName('');
      fetchDonors();
    } catch (err) {
      console.error(err);
    } finally {
      setDonorCreating(false);
    }
  };

  const handleDonorUpdate = async id => {
    if (!donorEditingName.trim()) return;
    try {
      await api.patch(`/admin/counterparties/${id}`, {
        name: donorEditingName.trim(),
      });
      setDonorEditingId(null);
      setDonorEditingName('');
      fetchDonors();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDonorDelete = async id => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/counterparties/${id}`);
      fetchDonors();
    } catch (err) {
      console.error(err);
    }
  };

  // --- 카테고리 CRUD ---
  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const { data } = await api.get('/admin/transaction-categories');
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCatLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">헌금 관리</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDonorDialogOpen(true);
              fetchDonors();
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            입출금자 등록
          </button>
          <button
            onClick={() => {
              setCatDialogOpen(true);
              fetchCategories();
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            카테고리 등록
          </button>
          <button
            onClick={() => navigate('/offering/register')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            헌금 등록
          </button>
          <button
            onClick={() => navigate('/offering/fund-register')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            울타리기금 등록
          </button>
        </div>
      </div>

      {/* 탭: 헌금 / 울타리기금 */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('offering')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'offering'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          헌금 리스트
        </button>
        <button
          onClick={() => setActiveTab('fund')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'fund'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          울타리기금 리스트
        </button>
      </div>

      {/* 헌금 거래내역 리스트 */}
      {activeTab === 'offering' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    거래일시
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    구분
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    보낸분/받는분
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    확정이름
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    출금액
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    입금액
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    잔액
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    카테고리
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      불러오는 중...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      등록된 헌금 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const isEditing =
                      editingTxId === tx.id && editingTxType === 'offering';
                    return (
                      <tr
                        key={tx.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              tx.type === 'expense'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.type === 'income' ? '입금' : '출금'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.rawName || '-'}
                        </td>
                        <td className="px-2 py-1 font-medium whitespace-nowrap">
                          {isEditing ? (
                            <Autocomplete
                              size="small"
                              options={donors}
                              getOptionLabel={opt => opt.name || ''}
                              value={
                                donors.find(d => d.id === editCounterpartyId) ||
                                null
                              }
                              onChange={(_, v) =>
                                setEditCounterpartyId(v?.id || null)
                              }
                              isOptionEqualToValue={(opt, val) =>
                                opt.id === val.id
                              }
                              renderInput={params => (
                                <TextField
                                  {...params}
                                  variant="outlined"
                                  size="small"
                                  placeholder="선택"
                                />
                              )}
                              sx={{ minWidth: 140 }}
                            />
                          ) : (
                            tx.counterparty?.name || '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">
                          {tx.withdrawal > 0
                            ? tx.withdrawal.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 whitespace-nowrap">
                          {tx.deposit > 0
                            ? tx.deposit.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                          {tx.balance.toLocaleString('ko-KR')}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {isEditing ? (
                            <Autocomplete
                              size="small"
                              options={getCategoryOptions(tx.type)}
                              getOptionLabel={opt => opt.name || ''}
                              value={
                                categories.find(c => c.id === editCategoryId) ||
                                null
                              }
                              onChange={(_, v) =>
                                setEditCategoryId(v?.id || null)
                              }
                              isOptionEqualToValue={(opt, val) =>
                                opt.id === val.id
                              }
                              renderInput={params => (
                                <TextField
                                  {...params}
                                  variant="outlined"
                                  size="small"
                                  placeholder="선택"
                                />
                              )}
                              sx={{ minWidth: 130 }}
                            />
                          ) : (
                            tx.category?.name || '-'
                          )}
                        </td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={cancelEdit}
                                disabled={editSaving}
                                className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition"
                              >
                                취소
                              </button>
                              <button
                                onClick={saveEdit}
                                disabled={editSaving}
                                className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded transition"
                              >
                                {editSaving ? '...' : '완료'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(tx, 'offering')}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              수정
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {txTotalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
              <span>
                총 {txTotal}건 (페이지 {txPage}/{txTotalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchTransactions(txPage - 1)}
                  disabled={txPage <= 1}
                  className="px-3 py-1 rounded border text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={() => fetchTransactions(txPage + 1)}
                  disabled={txPage >= txTotalPages}
                  className="px-3 py-1 rounded border text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 울타리기금 거래내역 리스트 */}
      {activeTab === 'fund' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    거래일시
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    구분
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    보낸분/받는분
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    확정이름
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    출금액
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    입금액
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    잔액
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    카테고리
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {fundLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      불러오는 중...
                    </td>
                  </tr>
                ) : fundTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      등록된 울타리기금 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  fundTransactions.map(tx => {
                    const isEditing =
                      editingTxId === tx.id && editingTxType === 'fund';
                    return (
                      <tr
                        key={tx.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'expense' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                          >
                            {tx.type === 'income' ? '입금' : '출금'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.rawName || '-'}
                        </td>
                        <td className="px-2 py-1 font-medium whitespace-nowrap">
                          {isEditing ? (
                            <Autocomplete
                              size="small"
                              options={donors}
                              getOptionLabel={opt => opt.name || ''}
                              value={
                                donors.find(d => d.id === editCounterpartyId) ||
                                null
                              }
                              onChange={(_, v) =>
                                setEditCounterpartyId(v?.id || null)
                              }
                              isOptionEqualToValue={(opt, val) =>
                                opt.id === val.id
                              }
                              renderInput={params => (
                                <TextField
                                  {...params}
                                  variant="outlined"
                                  size="small"
                                  placeholder="선택"
                                />
                              )}
                              sx={{ minWidth: 140 }}
                            />
                          ) : (
                            tx.counterparty?.name || '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">
                          {tx.withdrawal > 0
                            ? tx.withdrawal.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 whitespace-nowrap">
                          {tx.deposit > 0
                            ? tx.deposit.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                          {tx.balance.toLocaleString('ko-KR')}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {isEditing ? (
                            <Autocomplete
                              size="small"
                              options={getCategoryOptions(tx.type)}
                              getOptionLabel={opt => opt.name || ''}
                              value={
                                categories.find(c => c.id === editCategoryId) ||
                                null
                              }
                              onChange={(_, v) =>
                                setEditCategoryId(v?.id || null)
                              }
                              isOptionEqualToValue={(opt, val) =>
                                opt.id === val.id
                              }
                              renderInput={params => (
                                <TextField
                                  {...params}
                                  variant="outlined"
                                  size="small"
                                  placeholder="선택"
                                />
                              )}
                              sx={{ minWidth: 130 }}
                            />
                          ) : (
                            tx.category?.name || '-'
                          )}
                        </td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={cancelEdit}
                                disabled={editSaving}
                                className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition"
                              >
                                취소
                              </button>
                              <button
                                onClick={saveEdit}
                                disabled={editSaving}
                                className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded transition"
                              >
                                {editSaving ? '...' : '완료'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(tx, 'fund')}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              수정
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {fundTotalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
              <span>
                총 {fundTotal}건 (페이지 {fundPage}/{fundTotalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchFundTransactions(fundPage - 1)}
                  disabled={fundPage <= 1}
                  className="px-3 py-1 rounded border text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={() => fetchFundTransactions(fundPage + 1)}
                  disabled={fundPage >= fundTotalPages}
                  className="px-3 py-1 rounded border text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 입출금자 관리 다이얼로그 */}
      <Dialog
        open={donorDialogOpen}
        onClose={() => setDonorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        scroll="body"
      >
        <DialogTitle>입출금자 관리</DialogTitle>
        <DialogContent>
          <div className="flex gap-2 mb-4 items-end pt-3">
            <TextField
              value={donorNewName}
              onChange={e => setDonorNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDonorCreate()}
              label="이름"
              placeholder="입출금자 이름 입력"
              size="small"
              fullWidth
              variant="outlined"
            />
            <button
              onClick={handleDonorCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition whitespace-nowrap h-10"
            >
              등록
            </button>
          </div>

          {donorLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">
              불러오는 중...
            </p>
          ) : donors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              등록된 입출금자가 없습니다.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {donors.map((donor, idx) => (
                <div
                  key={donor.id}
                  className={`flex items-center justify-between px-3 py-2.5 ${
                    idx !== donors.length - 1 ? 'border-b' : ''
                  } hover:bg-gray-50`}
                >
                  {donorEditingId === donor.id ? (
                    <TextField
                      value={donorEditingName}
                      onChange={e => setDonorEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleDonorUpdate(donor.id);
                        if (e.key === 'Escape') {
                          setDonorEditingId(null);
                          setDonorEditingName('');
                        }
                      }}
                      onBlur={() => handleDonorUpdate(donor.id)}
                      autoFocus
                      size="small"
                      variant="outlined"
                      sx={{ flex: 1 }}
                    />
                  ) : (
                    <span className="text-sm text-gray-800">{donor.name}</span>
                  )}
                  <div className="flex items-center gap-1 ml-2">
                    {donorEditingId !== donor.id && (
                      <button
                        onClick={() => {
                          setDonorEditingId(donor.id);
                          setDonorEditingName(donor.name);
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        수정
                      </button>
                    )}
                    <button
                      onClick={() => handleDonorDelete(donor.id)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {donors.length > 0 && (
            <p className="text-xs text-gray-400 mt-3 text-right">
              총 {donors.length}명
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* 카테고리 관리 다이얼로그 */}
      <Dialog
        open={catDialogOpen}
        onClose={() => setCatDialogOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="body"
      >
        <DialogTitle>카테고리 관리</DialogTitle>
        <DialogContent>
          <div className="flex gap-6 pt-3">
            <CategoryPanel
              title="입금 카테고리"
              type="income"
              items={categories.filter(c => c.type === 'income')}
              loading={catLoading}
              onRefresh={fetchCategories}
            />
            <div className="w-px bg-gray-200" />
            <CategoryPanel
              title="출금 카테고리"
              type="expense"
              items={categories.filter(c => c.type === 'expense')}
              loading={catLoading}
              onRefresh={fetchCategories}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
