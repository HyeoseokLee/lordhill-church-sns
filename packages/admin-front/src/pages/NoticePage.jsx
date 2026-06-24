import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';

// Quill 에디터 툴바 설정
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }],
    ['clean'],
  ],
};

// 드래그 가능한 공지사항 행 컴포넌트
function SortableNoticeRow({
  notice,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onRestore,
}) {
  const isDeleted = !!notice.deletedAt;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notice.id, disabled: isDeleted });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* 행 */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer ${
          isDeleted ? 'bg-gray-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => onToggle(notice.id)}
      >
        {/* 드래그 핸들 */}
        {!isDeleted && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>
        )}
        {isDeleted && <div className="w-4 flex-shrink-0" />}

        {/* 제목 */}
        <div className={`flex-1 min-w-0 ${isDeleted ? 'text-gray-300' : ''}`}>
          <p className="text-sm font-medium truncate">{notice.title}</p>
        </div>

        {/* 날짜 */}
        <span
          className={`text-xs whitespace-nowrap ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`}
        >
          {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
        </span>

        {/* 상태 */}
        {isDeleted ? (
          <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium flex-shrink-0">
            삭제
          </span>
        ) : (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex-shrink-0">
            활성
          </span>
        )}

        {/* 관리 버튼 */}
        <div
          className="flex gap-1 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {!isDeleted && (
            <button
              onClick={() => onEdit(notice)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              수정
            </button>
          )}
          {isDeleted ? (
            <button
              onClick={() => onRestore(notice.id)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              복구
            </button>
          ) : (
            <button
              onClick={() => onDelete(notice.id)}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 아코디언 상세 */}
      {isExpanded && (
        <div className="bg-gray-50 px-6 py-4 border-b">
          <p className="text-xs font-medium text-gray-400 mb-1">내용</p>
          <div
            className="text-sm text-gray-700 bg-white rounded p-3 ql-editor"
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
        </div>
      )}
    </div>
  );
}

export default function NoticePage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  // 생성/수정 다이얼로그
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  // dnd-kit 센서 (5px 이상 움직여야 드래그 시작)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/notices');
      setNotices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // 드래그 종료 시 순서 변경
  const handleDragEnd = async event => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 활성 공지만 순서 변경 대상
    const activeNotices = notices.filter(n => !n.deletedAt);
    const oldIndex = activeNotices.findIndex(n => n.id === active.id);
    const newIndex = activeNotices.findIndex(n => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activeNotices, oldIndex, newIndex);
    const deletedNotices = notices.filter(n => !!n.deletedAt);
    setNotices([...reordered, ...deletedNotices]);

    // 서버에 순서 저장
    try {
      await api.patch('/admin/notices/reorder', {
        ids: reordered.map(n => n.id),
      });
    } catch {
      fetchNotices();
      alert('순서 변경에 실패했습니다.');
    }
  };

  // 다이얼로그 열기 (생성)
  const openCreateDialog = () => {
    setEditingNotice(null);
    setForm({ title: '', content: '' });
    setDialogOpen(true);
  };

  // 다이얼로그 열기 (수정)
  const openEditDialog = notice => {
    setEditingNotice(notice);
    setForm({ title: notice.title, content: notice.content });
    setDialogOpen(true);
  };

  // 저장 (생성/수정)
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      if (editingNotice) {
        await api.patch(`/admin/notices/${editingNotice.id}`, form);
      } else {
        await api.post('/admin/notices', form);
      }
      setDialogOpen(false);
      fetchNotices();
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 삭제/복구 처리
  const handleConfirm = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'delete') {
        await api.delete(`/admin/notices/${deleteModal.id}`);
      } else if (deleteModal.type === 'restore') {
        await api.patch(`/admin/notices/${deleteModal.id}/restore`);
      }
      setDeleteModal(null);
      fetchNotices();
    } catch {
      setDeleteModal(null);
      alert('처리에 실패했습니다.');
    }
  };

  const toggleExpand = id => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 활성/삭제 분리
  const activeNotices = notices.filter(n => !n.deletedAt);
  const deletedNotices = notices.filter(n => !!n.deletedAt);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">공지사항 관리</h2>
        <button
          onClick={openCreateDialog}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          공지사항 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            공지사항이 없습니다.
          </div>
        ) : (
          <>
            {/* 활성 공지 — 드래그앤드롭 가능 */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeNotices.map(n => n.id)}
                strategy={verticalListSortingStrategy}
              >
                {activeNotices.map(notice => (
                  <SortableNoticeRow
                    key={notice.id}
                    notice={notice}
                    isExpanded={expandedId === notice.id}
                    onToggle={toggleExpand}
                    onEdit={openEditDialog}
                    onDelete={id => setDeleteModal({ type: 'delete', id })}
                    onRestore={id => setDeleteModal({ type: 'restore', id })}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* 삭제된 공지 — 드래그 불가 */}
            {deletedNotices.map(notice => (
              <SortableNoticeRow
                key={notice.id}
                notice={notice}
                isExpanded={expandedId === notice.id}
                onToggle={toggleExpand}
                onEdit={openEditDialog}
                onDelete={id => setDeleteModal({ type: 'delete', id })}
                onRestore={id => setDeleteModal({ type: 'restore', id })}
              />
            ))}
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        ⠿ 아이콘을 드래그하여 순서를 변경할 수 있습니다.
      </p>

      {/* 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">
            {editingNotice ? '공지사항 수정' : '공지사항 등록'}
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="공지사항 제목"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <ReactQuill
              theme="snow"
              value={form.content}
              onChange={v => setForm({ ...form, content: v })}
              modules={quillModules}
              style={{ height: '250px', marginBottom: '50px' }}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* 삭제/복구 확인 모달 */}
      <ConfirmModal
        open={!!deleteModal}
        message={
          deleteModal?.type === 'restore'
            ? '이 공지사항을 복구하시겠습니까?'
            : '이 공지사항을 삭제하시겠습니까?'
        }
        confirmText={deleteModal?.type === 'restore' ? '복구' : '삭제'}
        confirmColor={deleteModal?.type === 'restore' ? 'blue' : 'red'}
        onConfirm={handleConfirm}
        onCancel={() => setDeleteModal(null)}
      />
    </div>
  );
}
