import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  User,
  Pencil,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import ConfirmModal from '@/components/common/ConfirmModal';
import ImageCarousel from '@/components/common/ImageCarousel';
import { useRecycle } from '@/hooks/api/useRecycle';
import { useRecycleComments } from '@/hooks/api/useRecycleComments';
import { useAuthStore } from '@/stores/authStore';
import { recycleApi } from '@/api/recycleApi';
import { formatRelativeTime } from '@/util/dateUtil';
import { contentLimit } from '@/config/define';

// 돌고래 상세 페이지
export default function RecycleDetailPage() {
  const { recycleId } = useParams<{ recycleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const {
    item,
    isLoading: itemLoading,
    error: itemError,
    mutate: mutateItem,
  } = useRecycle(recycleId || '');
  const {
    comments,
    isLoading: commentsLoading,
    mutate: mutateComments,
  } = useRecycleComments(recycleId || '');

  // 수정 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 댓글 상태
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const isSubmittingRef = useRef(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // 삭제 모달
  const [deleteModal, setDeleteModal] = useState<{
    type: 'recycle' | 'comment';
    id: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isMine =
    item && currentUser && String(item.user?.id) === String(currentUser.id);

  // 댓글 포커스
  useEffect(() => {
    if (searchParams.get('focus') === 'comment' && !itemLoading && item) {
      setTimeout(() => commentInputRef.current?.focus(), 300);
    }
  }, [searchParams, itemLoading, item]);

  // 수정
  const handleEditStart = () => {
    setEditTitle(item?.title || '');
    setEditContent(item?.content || '');
    setIsEditing(true);
  };
  const handleEditCancel = () => {
    setIsEditing(false);
  };
  const handleEditSave = async () => {
    if (!recycleId || !editTitle.trim()) return;
    setIsSaving(true);
    try {
      await recycleApi.update(recycleId, editTitle.trim(), editContent.trim());
      await mutateItem();
      setIsEditing(false);
      window.dispatchEvent(new Event('recycle-refresh'));
    } catch {
      /* */
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제
  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'recycle') {
        await recycleApi.delete(deleteModal.id);
        window.dispatchEvent(new Event('recycle-refresh'));
        setDeleteModal(null);
        navigate(-1);
      } else {
        await recycleApi.deleteComment(deleteModal.id);
        setDeleteModal(null);
        await mutateComments();
        await mutateItem();
      }
    } catch {
      setDeleteModal(null);
    }
  };

  // 댓글 작성
  const handleCommentSubmit = async () => {
    if (!recycleId || !commentText.trim() || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmittingComment(true);
    try {
      await recycleApi.createComment(recycleId, commentText.trim());
      setCommentText('');
      await mutateComments();
      await mutateItem();
      window.dispatchEvent(new Event('recycle-refresh'));
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    } catch {
      /* */
    } finally {
      setIsSubmittingComment(false);
      isSubmittingRef.current = false;
    }
  };

  // 댓글 수정
  const handleCommentEditSave = async () => {
    if (!editingCommentId || !editCommentText.trim()) return;
    setIsSavingComment(true);
    try {
      await recycleApi.updateComment(
        String(editingCommentId),
        editCommentText.trim(),
      );
      setEditingCommentId(null);
      setEditCommentText('');
      await mutateComments();
    } catch {
      /* */
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  // 에러
  if (!itemLoading && (itemError || !item)) {
    return (
      <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
        <SubPageHeader title="돌고래" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-text-muted">
            게시글을 찾을 수 없습니다.
          </p>
        </div>
      </FullHeightBox>
    );
  }

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="돌고래" />

      <div className="scrollInner" ref={scrollRef}>
        {/* 이미지 캐러셀 */}
        {item?.media?.length > 0 && <ImageCarousel images={item.media} />}

        {/* 작성자 + 수정/삭제 */}
        <div className="flex items-center gap-3 mb-3">
          {item ? (
            item.user?.profileImageUrl ? (
              <img
                src={item.user.profileImageUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center flex-shrink-0">
                <User size={20} strokeWidth={1.5} className="text-text-muted" />
              </div>
            )
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface flex-shrink-0 animate-pulse" />
          )}
          <div className="flex-1 min-w-0">
            {item ? (
              <>
                <p className="text-[14px] font-bold text-text truncate">
                  {item.user?.nickname || '익명'}
                </p>
                <p className="text-[12px] text-text-muted">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-3.5 w-16 bg-surface-strong rounded mb-2" />
                <div className="h-3 w-12 bg-surface rounded" />
              </div>
            )}
          </div>
          {item && isMine && !isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleEditStart}
                className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
              >
                <Pencil size={16} strokeWidth={1.5} />
              </button>
              <button
                onClick={() =>
                  setDeleteModal({ type: 'recycle', id: recycleId! })
                }
                className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* 제목 + 내용 */}
        <div className="pb-4 border-b border-surface">
          {!item ? (
            <div className="animate-pulse space-y-2 py-2">
              <div className="h-4 w-3/4 bg-surface-strong rounded" />
              <div className="h-3.5 w-full bg-surface-strong rounded" />
              <div className="h-3.5 w-2/3 bg-surface rounded" />
            </div>
          ) : isEditing ? (
            <div>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                maxLength={200}
                className="w-full text-[16px] font-bold text-text placeholder-text-muted outline-none pb-3 border-b border-surface"
                placeholder="제목"
              />
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                maxLength={contentLimit.postMaxLength}
                className="w-full min-h-[120px] bg-surface rounded-[12px] p-3 text-[15px] text-text resize-none outline-none mt-3"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleEditCancel}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-text-muted rounded-[8px] hover:bg-surface"
                >
                  <X size={14} strokeWidth={2} />
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving || !editTitle.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-white bg-accent rounded-[8px] hover:bg-accent-dark disabled:opacity-40"
                >
                  <Check size={14} strokeWidth={2} />
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-[18px] font-bold text-text mb-2">
                {item.title}
              </h2>
              {item.content && (
                <p className="text-[15px] text-text leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </p>
              )}
              <div className="flex items-center gap-1 mt-3 text-text-muted">
                <MessageSquare size={16} strokeWidth={1.5} />
                <span className="text-[13px]">{item.commentCount || 0}</span>
              </div>
            </>
          )}
        </div>

        {/* 댓글 목록 */}
        {!isEditing && (
          <div className="pt-3 pb-4">
            {commentsLoading ? (
              <p className="text-[13px] text-text-muted py-4 text-center">
                댓글을 불러오는 중...
              </p>
            ) : comments.length === 0 ? (
              <p className="text-[13px] text-text-muted py-4 text-center">
                아직 댓글이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col">
                {comments.map((comment: any) => {
                  const isMyComment =
                    currentUser &&
                    String(comment.user?.id) === String(currentUser.id);
                  const isEditingThis = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="py-3 flex gap-3">
                      {comment.user?.profileImageUrl ? (
                        <img
                          src={comment.user.profileImageUrl}
                          alt=""
                          className={`w-8 h-8 rounded-full object-cover flex-shrink-0 ${isMyComment ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center flex-shrink-0 ${isMyComment ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                        >
                          <User
                            size={14}
                            strokeWidth={1.5}
                            className="text-text-muted"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-text">
                            {comment.user?.nickname || '익명'}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                          {isMyComment && !isEditingThis && (
                            <div className="ml-auto flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentText(comment.content);
                                }}
                                className="text-text-muted"
                              >
                                <Pencil size={12} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteModal({
                                    type: 'comment',
                                    id: String(comment.id),
                                  })
                                }
                                className="text-text-muted"
                              >
                                <Trash2 size={12} strokeWidth={1.5} />
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditingThis ? (
                          <div className="mt-1">
                            <textarea
                              value={editCommentText}
                              onChange={e => setEditCommentText(e.target.value)}
                              maxLength={contentLimit.commentMaxLength}
                              className="w-full min-h-[60px] bg-surface rounded-[8px] p-2 text-[13px] text-text resize-none outline-none"
                            />
                            <div className="flex justify-end gap-1 mt-1">
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentText('');
                                }}
                                disabled={isSavingComment}
                                className="px-2 py-1 text-[12px] text-text-muted rounded hover:bg-surface"
                              >
                                취소
                              </button>
                              <button
                                onClick={handleCommentEditSave}
                                disabled={
                                  isSavingComment || !editCommentText.trim()
                                }
                                className="px-2 py-1 text-[12px] text-white bg-accent rounded hover:bg-accent-dark disabled:opacity-40"
                              >
                                {isSavingComment ? '저장 중...' : '저장'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[13px] text-text mt-0.5 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 댓글 입력 */}
      {!isEditing && (
        <div className="w-full px-5 py-3 border-t border-surface bg-bg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              ref={commentInputRef}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={handleCommentKeyDown}
              placeholder="댓글을 입력하세요..."
              maxLength={contentLimit.commentMaxLength}
              className="flex-1 px-4 py-2.5 bg-surface rounded-full text-[13px] text-text placeholder-text-muted outline-none"
            />
            <button
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || isSubmittingComment}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
            >
              <Send size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={!!deleteModal}
        message={
          deleteModal?.type === 'recycle'
            ? '게시글을 삭제하시겠습니까?\n댓글도 모두 삭제됩니다.\n관리자가 복구할 수 있습니다.'
            : '댓글을 삭제하시겠습니까?\n관리자가 복구할 수 있습니다.'
        }
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal(null)}
      />
    </FullHeightBox>
  );
}
