import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import toast from 'react-hot-toast';
import api from '../lib/api';

// 카테고리가 지정되지 않은 거래(미분류)를 가리키는 값. 서버와 값을 맞출 것.
const UNCATEGORIZED_ID = 0;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEAR_RANGE = 5;
const CONTENT_MAX_LENGTH = 1000;

const selectClass =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white';

const typeLabel = type => (type === 'income' ? '입금' : '출금');

// 헌금 통계의 월별 카테고리 메모를 등록/수정/삭제하는 다이얼로그
export default function CategoryNoteDialog({ open, onClose }) {
  const thisYear = new Date().getFullYear();

  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [type, setType] = useState('income');
  const [categoryId, setCategoryId] = useState(UNCATEGORIZED_ID);
  const [content, setContent] = useState('');

  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  const years = Array.from({ length: YEAR_RANGE }, (_, i) => thisYear - i);
  const categoryOptions = categories.filter(c => c.type === type);

  // 선택된 칸에 이미 저장된 메모
  const currentNote = notes.find(
    n => n.month === month && n.type === type && n.categoryId === categoryId,
  );

  // 하단 목록은 위에서 고른 연/월에 해당하는 것만 보여준다 (입금·출금은 함께).
  const monthNotes = notes.filter(n => n.month === month);

  const fetchNotes = useCallback(async targetYear => {
    try {
      const { data } = await api.get(
        `/admin/category-notes?year=${targetYear}`,
      );
      setNotes(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    api
      .get('/admin/transaction-categories')
      .then(({ data }) => setCategories(data))
      .catch(console.error);
    fetchNotes(year);
  }, [open, year, fetchNotes]);

  // 칸을 옮기면 그 칸에 저장된 내용을 불러온다.
  // currentNote가 아니라 칸 자체를 의존성으로 둬야, 메모 없는 칸끼리 옮길 때도 입력값이 초기화된다.
  useEffect(() => {
    const found = notes.find(
      n => n.month === month && n.type === type && n.categoryId === categoryId,
    );
    setContent(found?.content || '');
  }, [year, month, type, categoryId, notes]);

  // 구분을 바꾸면 카테고리 선택을 미분류로 되돌린다 (입금/출금 카테고리가 다르므로)
  const handleTypeChange = nextType => {
    setType(nextType);
    setCategoryId(UNCATEGORIZED_ID);
  };

  // 목록에서 항목을 고르면 그 칸으로 폼을 옮긴다.
  // 구분과 카테고리를 함께 지정하므로 handleTypeChange의 초기화를 쓰지 않는다.
  const handleSelectNote = note => {
    setType(note.type);
    setCategoryId(note.categoryId);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!content.trim()) {
      toast.error('메모 내용을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/category-notes', {
        type,
        year,
        month,
        categoryId,
        content: content.trim(),
      });
      toast.success('메모를 저장했습니다.');
      await fetchNotes(year);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || '저장 중 오류가 발생했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async note => {
    if (saving) return;
    if (!confirm(`${note.month}월 ${typeLabel(note.type)} 메모를 삭제할까요?`))
      return;

    setSaving(true);
    try {
      await api.delete(`/admin/category-notes/${note.id}`);
      toast.success('메모를 삭제했습니다.');
      await fetchNotes(year);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || '삭제 중 오류가 발생했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const categoryNameOf = note =>
    note.category?.name ||
    (note.categoryId === UNCATEGORIZED_ID ? '미분류' : `#${note.categoryId}`);

  // 삭제된 카테고리를 가리키는 경우에도 선택 상태를 보여줄 수 있게 항목을 덧붙인다.
  const missingOption =
    categoryId !== UNCATEGORIZED_ID &&
    !categoryOptions.some(c => c.id === categoryId)
      ? categoryId
      : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="body">
      <DialogTitle>카테고리 메모 등록</DialogTitle>
      <DialogContent>
        <p className="text-[13px] text-gray-500 mb-4">
          여기 작성한 메모는 앱의 헌금 통계 화면에서 해당 카테고리를 펼치면
          <strong className="text-gray-700"> 교인 모두에게 보입니다.</strong>
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className={selectClass}
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>

          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className={selectClass}
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={e => handleTypeChange(e.target.value)}
            className={selectClass}
          >
            <option value="income">입금</option>
            <option value="expense">출금</option>
          </select>

          <select
            value={categoryId}
            onChange={e => setCategoryId(Number(e.target.value))}
            className={selectClass}
          >
            <option value={UNCATEGORIZED_ID}>미분류</option>
            {categoryOptions.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {missingOption !== null && (
              <option value={missingOption}>
                (삭제된 카테고리 #{missingOption})
              </option>
            )}
          </select>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={saving}
          rows={6}
          maxLength={CONTENT_MAX_LENGTH}
          placeholder="예) 8월은 추수감사절 헌금이 함께 집계되었습니다."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y disabled:bg-gray-50"
        />

        <div className="flex items-center justify-between mt-2 mb-5">
          <span className="text-[12px] text-gray-400">
            {currentNote
              ? '이미 등록된 메모입니다. 저장하면 덮어씁니다.'
              : '아직 메모가 없는 항목입니다.'}
            {currentNote && currentNote.visible === false && (
              <strong className="text-amber-600">
                {' '}
                · 이 달에 해당 카테고리 거래가 없어 앱에 표시되지 않습니다.
              </strong>
            )}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400">
              {content.length} / {CONTENT_MAX_LENGTH}
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>

        {/* 선택한 연/월에 등록된 메모 */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-[13px] font-semibold text-gray-700 mb-2">
            {year}년 {month}월 등록된 메모 ({monthNotes.length}건)
          </p>
          {monthNotes.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-3">
              이 달에 등록된 메모가 없습니다.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {monthNotes.map(n => {
                const isCurrent =
                  n.type === type && n.categoryId === categoryId;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-3 py-2.5 ${
                      isCurrent ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-gray-500 mb-0.5">
                        {typeLabel(n.type)} · {categoryNameOf(n)}
                        {n.visible === false && (
                          <span className="text-amber-600">
                            {' '}
                            · 앱에 표시 안 됨
                          </span>
                        )}
                      </p>
                      <p className="text-[13px] text-gray-800 line-clamp-2 whitespace-pre-wrap">
                        {n.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSelectNote(n)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] font-medium hover:bg-gray-50 transition"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(n)}
                        disabled={saving}
                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[12px] font-medium hover:bg-red-50 transition disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
