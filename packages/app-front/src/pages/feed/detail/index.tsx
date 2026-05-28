import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
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
import { usePost } from '@/hooks/api/usePost';
import { useComments } from '@/hooks/api/useComments';
import { useAuthStore } from '@/stores/authStore';
import { postApi } from '@/api/postApi';
import { commentApi } from '@/api/commentApi';
import { formatRelativeTime } from '@/util/dateUtil';
import { contentLimit } from '@/config/define';

// 게시글 상세 페이지 (피드의 자식)
export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const {
    post,
    isLoading: postLoading,
    error: postError,
    mutate: mutatePost,
  } = usePost(postId || '');
  const {
    comments,
    isLoading: commentsLoading,
    mutate: mutateComments,
  } = useComments(postId || '');

  // 게시글 수정 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 댓글 작성 상태
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 댓글 수정 상태
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // 삭제 확인 모달 상태
  const [deleteModal, setDeleteModal] = useState<{
    type: 'post' | 'comment';
    id: string;
  } | null>(null);

  // 댓글 작성 후 스크롤 하단 이동용
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMyPost =
    post && currentUser && String(post.user?.id) === String(currentUser.id);

  // 게시글 수정
  const handleEditStart = () => {
    setEditContent(post?.content || '');
    setIsEditing(true);
  };
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };
  const handleEditSave = async () => {
    if (!postId || !editContent.trim()) return;
    setIsSaving(true);
    try {
      await postApi.updatePost(postId, editContent.trim());
      await mutatePost();
      setIsEditing(false);
      window.dispatchEvent(new Event('feed-refresh'));
    } catch {
      /* 에러 시 수정 모드 유지 */
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제 확인 후 실행
  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'post') {
        await postApi.deletePost(deleteModal.id);
        window.dispatchEvent(new Event('feed-refresh'));
        setDeleteModal(null);
        navigate(-1);
      } else {
        await commentApi.deleteComment(deleteModal.id);
        setDeleteModal(null);
        await mutateComments();
        await mutatePost();
        window.dispatchEvent(new Event('feed-refresh'));
      }
    } catch {
      setDeleteModal(null);
    }
  };

  // 댓글 작성
  const handleCommentSubmit = async () => {
    if (!postId || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await commentApi.createComment(postId, commentText.trim());
      setCommentText('');
      await mutateComments();
      await mutatePost();
      window.dispatchEvent(new Event('feed-refresh'));
      // 스크롤 하단으로 이동
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    } catch {
      /* 에러 */
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 댓글 수정
  const handleCommentEditStart = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };
  const handleCommentEditCancel = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };
  const handleCommentEditSave = async () => {
    if (!editingCommentId || !editCommentText.trim()) return;
    setIsSavingComment(true);
    try {
      await commentApi.updateComment(
        String(editingCommentId),
        editCommentText.trim(),
      );
      setEditingCommentId(null);
      setEditCommentText('');
      await mutateComments();
    } catch {
      /* 에러 */
    } finally {
      setIsSavingComment(false);
    }
  };

  // 엔터키로 댓글 전송
  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  // 에러 또는 게시글 없음 (로딩 완료 후)
  if (!postLoading && (postError || !post)) {
    return (
      <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
        <SubPageHeader title="게시글" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-text-muted">
            {postError
              ? '게시글을 불러올 수 없습니다.'
              : '게시글을 찾을 수 없습니다.'}
          </p>
        </div>
      </FullHeightBox>
    );
  }

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      {/* 상단 고정 헤더 */}
      <SubPageHeader title="게시글" />

      {/* 스크롤 영역 (게시글 + 댓글 전체 스크롤) */}
      <div className="scrollInner" ref={scrollRef}>
        {/* 게시글 본문 */}
        <div className="pt-2 pb-4 border-b border-surface">
          {/* 작성자 + 수정 버튼 */}
          <div className="flex items-center gap-3 mb-3">
            {post ? (
              post.user?.profileImageUrl ? (
                <img
                  src={post.user.profileImageUrl}
                  alt=""
                  className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${isMyPost ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center flex-shrink-0 ${isMyPost ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                >
                  <User
                    size={20}
                    strokeWidth={1.5}
                    className="text-text-muted"
                  />
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-text truncate">
                {post ? post.user?.nickname || '익명' : '\u00A0'}
              </p>
              <p className="text-[12px] text-text-muted">
                {post ? formatRelativeTime(post.createdAt) : '\u00A0'}
              </p>
            </div>
            {post && isMyPost && !isEditing && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEditStart}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
                >
                  <Pencil size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setDeleteModal({ type: 'post', id: postId! })}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {/* 본문 — 로딩 중 빈 공간 / 수정 모드 / 읽기 모드 */}
          {!post ? (
            <div className="min-h-[80px]" />
          ) : isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                maxLength={contentLimit.postMaxLength}
                className="w-full min-h-[180px] bg-surface rounded-[12px] p-3 text-[15px] text-text placeholder-text-muted resize-none outline-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleEditCancel}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-text-muted rounded-[8px] hover:bg-surface transition-colors duration-150"
                >
                  <X size={14} strokeWidth={2} />
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving || !editContent.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-white bg-accent rounded-[8px] hover:bg-accent-dark transition-colors duration-150 disabled:opacity-40"
                >
                  <Check size={14} strokeWidth={2} />
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {post.content && (
                <p className="text-[15px] text-text leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              )}
              {/* 이미지 */}
              {post.media?.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {post.media.map((m: any) => (
                    <img
                      key={m.id}
                      src={m.url}
                      alt=""
                      className="w-full rounded-[12px] object-cover"
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* 좋아요/댓글 카운트 */}
          {post && !isEditing && (
            <div className="flex items-center gap-4 mt-4 text-text-muted">
              <button
                onClick={() =>
                  postApi.toggleLike(String(post.id)).then(() => {
                    mutatePost();
                    window.dispatchEvent(new Event('feed-refresh'));
                  })
                }
                className="flex items-center gap-1"
              >
                <Heart
                  size={18}
                  strokeWidth={1.5}
                  className={post.isLiked ? 'fill-error text-error' : ''}
                />
                <span className="text-[13px]">{post.likeCount || 0}</span>
              </button>
              <div className="flex items-center gap-1">
                <MessageSquare size={18} strokeWidth={1.5} />
                <span className="text-[13px]">{post.commentCount || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* 댓글 목록 */}
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
                    {/* 댓글 프로필 */}
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
                        {/* 본인 댓글 수정/삭제 버튼 */}
                        {isMyComment && !isEditingThis && (
                          <div className="ml-auto flex items-center gap-3">
                            <button
                              onClick={() => handleCommentEditStart(comment)}
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
                      {/* 댓글 내용 — 수정 모드 / 읽기 모드 */}
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
                              onClick={handleCommentEditCancel}
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
      </div>

      {/* 댓글 입력 (하단 고정) */}
      <div className="w-full px-5 py-3 border-t border-surface bg-bg">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={commentText}
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
      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={!!deleteModal}
        message={
          deleteModal?.type === 'post'
            ? '게시글을 삭제하시겠습니까?\n좋아요와 댓글도 모두 삭제됩니다.'
            : '댓글을 삭제하시겠습니까?'
        }
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal(null)}
      />
    </FullHeightBox>
  );
}
