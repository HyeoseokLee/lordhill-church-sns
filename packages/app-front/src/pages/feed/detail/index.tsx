import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart,
  MessageSquare,
  Send,
  User,
  Pencil,
  Check,
  X,
  ImagePlus,
  Trash2,
  Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import ConfirmModal from '@/components/common/ConfirmModal';
import ReportModal from '@/components/common/ReportModal';
import { reportApi, type ReportTargetType } from '@/api/reportApi';
import { usePost } from '@/hooks/api/usePost';
import { useComments } from '@/hooks/api/useComments';
import { useAuthStore } from '@/stores/authStore';
import { postApi } from '@/api/postApi';
import { commentApi } from '@/api/commentApi';
import { formatRelativeTime } from '@/util/dateUtil';
import { contentLimit } from '@/config/define';
import ImageCarousel from '@/components/common/ImageCarousel';

// 게시글 상세 페이지 (피드의 자식)
export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const commentInputRef = useRef<HTMLInputElement>(null);
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
  // 좋아요 아바타 툴팁 (탭 토글, 다른 곳 탭 시 닫힘)
  const [tooltipUserId, setTooltipUserId] = useState<number | null>(null);
  useEffect(() => {
    if (!tooltipUserId) return;
    const close = () => setTooltipUserId(null);
    // 다음 틱에 등록 (현재 탭 이벤트가 즉시 닫히는 것 방지)
    const timer = setTimeout(
      () => document.addEventListener('click', close),
      0,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [tooltipUserId]);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // 수정 모드 이미지 상태
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // 댓글 작성 상태
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 댓글 수정 상태
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // 신고 모달 상태
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: number;
    userId?: number;
  } | null>(null);
  // 내가 신고한 대상 ID 세트
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  // 내 신고 내역 조회 (게시글 + 댓글)
  useEffect(() => {
    if (!post || !comments) return;
    const postIds = [Number(postId)];
    const commentIds = comments.map((c: any) => c.id);
    const fetchReports = async () => {
      try {
        const [postRes, commentRes] = await Promise.all([
          reportApi.getMine('post', postIds),
          commentIds.length > 0
            ? reportApi.getMine('comment', commentIds)
            : Promise.resolve({ data: [] }),
        ]);
        const ids = new Set<string>();
        postRes.data.forEach(r => ids.add(`${r.targetType}_${r.targetId}`));
        commentRes.data.forEach(r => ids.add(`${r.targetType}_${r.targetId}`));
        setReportedIds(ids);
      } catch {
        // 실패해도 무시
      }
    };
    fetchReports();
  }, [post, comments, postId]);

  // 신고 성공 시 로컬 상태 업데이트
  const handleReportSuccess = () => {
    if (reportTarget) {
      setReportedIds(prev => {
        const next = new Set(prev);
        next.add(`${reportTarget.type}_${reportTarget.id}`);
        return next;
      });
    }
  };

  // ?focus=comment 쿼리 시 댓글 입력에 포커스
  useEffect(() => {
    if (searchParams.get('focus') === 'comment' && !postLoading && post) {
      setTimeout(() => commentInputRef.current?.focus(), 300);
    }
  }, [searchParams, postLoading, post]);

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
    setNewImages([]);
    setNewPreviews([]);
    setIsEditing(true);
  };
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent('');
    newPreviews.forEach(url => URL.revokeObjectURL(url));
    setNewImages([]);
    setNewPreviews([]);
  };

  // 수정 모드 — 기존 이미지 삭제 (즉시 DB + S3 삭제)
  const handleDeleteExistingMedia = async (mediaId: number) => {
    try {
      await postApi.deleteMedia(String(mediaId));
      await mutatePost();
    } catch {
      /* 에러 */
    }
  };

  // 수정 모드 — 새 이미지 추가
  const handleEditAddImages = useCallback(
    (files: File[]) => {
      const existingCount = post?.media?.length || 0;
      const remaining = 10 - existingCount - newImages.length;
      const selected = files.slice(0, remaining);
      if (selected.length === 0) return;
      setNewImages(prev => [...prev, ...selected]);
      setNewPreviews(prev => [
        ...prev,
        ...selected.map(f => URL.createObjectURL(f)),
      ]);
    },
    [newImages.length, post?.media?.length],
  );

  // 수정 모드 — 네이티브 브릿지 연결
  const editAddImagesRef = useRef(handleEditAddImages);
  useEffect(() => {
    editAddImagesRef.current = handleEditAddImages;
  }, [handleEditAddImages]);

  useEffect(() => {
    if (!isEditing) return;
    // 수정 모드 진입 시 __onImagesPicked를 수정용으로 덮어쓰기
    window.__onImagesPicked = pickedImages => {
      const files = pickedImages.map(img => {
        const byteString = atob(img.base64.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        return new File([ab], img.filename, { type: img.contentType });
      });
      editAddImagesRef.current(files);
    };
    return () => {
      delete window.__onImagesPicked;
    };
  }, [isEditing]);

  // 수정 모드 — 사진 추가 버튼 (네이티브 → 폴백 웹 input)
  const handleEditPickImages = useCallback(() => {
    const existingCount = post?.media?.length || 0;
    const remaining = 10 - existingCount - newImages.length;
    if (remaining <= 0) return;

    if (window.webkit?.messageHandlers?.pickImages) {
      window.webkit.messageHandlers.pickImages.postMessage(remaining);
      return;
    }
    if (window.AndroidBridge?.pickImages) {
      window.AndroidBridge.pickImages(remaining);
      return;
    }
    editFileInputRef.current?.click();
  }, [post?.media?.length, newImages.length]);

  // 수정 모드 — 새 이미지 제거 (미리보기만, 아직 업로드 안 됨)
  const handleRemoveNewImage = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditSave = async () => {
    if (!postId || !editContent.trim()) return;
    setIsSaving(true);
    try {
      let newMediaKeys: string[] = [];

      // 새 이미지가 있으면 presign → S3 업로드
      if (newImages.length > 0) {
        const filesMeta = newImages.map(f => ({
          filename: f.name,
          contentType: f.type,
        }));
        const { data: presigned } = await postApi.presignImages(filesMeta);
        await Promise.all(
          presigned.map((item: any, i: number) =>
            postApi.uploadToS3(item.presignedUrl, newImages[i]),
          ),
        );
        newMediaKeys = presigned.map((item: any) => item.key);
      }

      await postApi.updatePost(postId, editContent.trim(), newMediaKeys);
      await mutatePost();
      setIsEditing(false);
      setNewImages([]);
      setNewPreviews([]);
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

  // 댓글 작성 (중복 호출 방지)
  const isSubmittingRef = useRef(false);
  const handleCommentSubmit = async () => {
    if (!postId || !commentText.trim() || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
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
              <div className="w-10 h-10 rounded-full bg-surface flex-shrink-0 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              {post ? (
                <>
                  <p className="text-[14px] font-bold text-text truncate">
                    {post.user?.nickname || '익명'}
                  </p>
                  <p className="text-[12px] text-text-muted">
                    {formatRelativeTime(post.createdAt)}
                  </p>
                </>
              ) : (
                <div className="animate-pulse">
                  <div className="h-3.5 w-16 bg-surface-strong rounded mb-2" />
                  <div className="h-3 w-12 bg-surface rounded" />
                </div>
              )}
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
            {/* 타인 게시글 신고 버튼 */}
            {post && !isMyPost && (
              <button
                onClick={() =>
                  reportedIds.has(`post_${postId}`)
                    ? toast('이미 신고한 콘텐츠입니다.')
                    : setReportTarget({
                        type: 'post',
                        id: Number(postId),
                        userId: post.user?.id,
                      })
                }
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface transition-colors duration-150"
              >
                <Flag
                  size={16}
                  strokeWidth={1.5}
                  className={
                    reportedIds.has(`post_${postId}`)
                      ? 'text-error fill-error'
                      : 'text-text-muted'
                  }
                />
              </button>
            )}
          </div>

          {/* 본문 — 로딩 중 빈 공간 / 수정 모드 / 읽기 모드 */}
          {!post ? (
            <div className="animate-pulse space-y-2 py-2">
              <div className="h-3.5 w-full bg-surface-strong rounded" />
              <div className="h-3.5 w-3/4 bg-surface rounded" />
            </div>
          ) : isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                maxLength={contentLimit.postMaxLength}
                className="w-full min-h-[180px] bg-surface rounded-[12px] p-3 text-[15px] text-text placeholder-text-muted resize-none outline-none"
              />
              {/* 기존 이미지 + 새 이미지 미리보기 */}
              <div className="flex gap-2 flex-wrap mt-3">
                {/* 기존 이미지 */}
                {post.media?.map((m: any) => (
                  <div
                    key={m.id}
                    className="relative w-20 h-20 rounded-[8px] overflow-hidden"
                  >
                    <img
                      src={m.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleDeleteExistingMedia(m.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
                {/* 새 이미지 */}
                {newPreviews.map((src, i) => (
                  <div
                    key={src}
                    className="relative w-20 h-20 rounded-[8px] overflow-hidden border-2 border-accent"
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveNewImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
              {/* 이미지 추가 버튼 */}
              <button
                onClick={handleEditPickImages}
                disabled={(post.media?.length || 0) + newImages.length >= 10}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-surface rounded-[12px] text-text-muted text-[13px] font-semibold hover:bg-surface-strong transition-colors duration-150 disabled:opacity-40"
              >
                <ImagePlus size={16} strokeWidth={1.5} />
                사진 추가
              </button>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={e => {
                  handleEditAddImages(Array.from(e.target.files || []));
                  e.target.value = '';
                }}
                className="hidden"
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
                <div className="mt-3">
                  <ImageCarousel images={post.media} />
                </div>
              )}
            </>
          )}

          {/* 좋아요 + 누른 사람 아바타 */}
          {post && !isEditing && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() =>
                  postApi.toggleLike(String(post.id)).then(() => {
                    mutatePost();
                    window.dispatchEvent(new Event('feed-refresh'));
                  })
                }
                className="flex items-center gap-1 text-text-muted flex-shrink-0"
              >
                <Heart
                  size={22}
                  strokeWidth={1.5}
                  className={post.isLiked ? 'fill-error text-error' : ''}
                />
                <span className="text-[14px]">{post.likeCount || 0}</span>
              </button>
              {post.likedUsers?.length > 0 && (
                <div
                  className="flex items-center flex-1 min-w-0"
                  style={{
                    marginLeft: 0,
                  }}
                >
                  {post.likedUsers.map((u: any, idx: number) => (
                    <div
                      key={u.id}
                      className="relative flex-shrink-0"
                      style={{
                        marginLeft:
                          idx === 0
                            ? 0
                            : -4 - Math.max(0, post.likedUsers.length - 8),
                        zIndex: post.likedUsers.length - idx,
                      }}
                    >
                      {u.profileImageUrl ? (
                        <img
                          src={u.profileImageUrl}
                          alt=""
                          onClick={() =>
                            setTooltipUserId(
                              tooltipUserId === u.id ? null : u.id,
                            )
                          }
                          className="w-7 h-7 rounded-full object-cover border-2 border-white cursor-pointer"
                        />
                      ) : (
                        <div
                          onClick={() =>
                            setTooltipUserId(
                              tooltipUserId === u.id ? null : u.id,
                            )
                          }
                          className="w-7 h-7 rounded-full bg-surface-strong border-2 border-white flex items-center justify-center cursor-pointer"
                        >
                          <User
                            size={12}
                            strokeWidth={1.5}
                            className="text-text-muted"
                          />
                        </div>
                      )}
                      {/* 말풍선 툴팁 (탭 토글) */}
                      {tooltipUserId === u.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-text text-white text-[11px] rounded-md whitespace-nowrap z-50">
                          {u.nickname}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 댓글 목록 (수정 모드에서는 숨김) */}
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
                          {/* 타인 댓글 신고 버튼 */}
                          {!isMyComment && !isEditingThis && (
                            <button
                              onClick={() =>
                                reportedIds.has(`comment_${comment.id}`)
                                  ? toast('이미 신고한 콘텐츠입니다.')
                                  : setReportTarget({
                                      type: 'comment',
                                      id: comment.id,
                                      userId: comment.user?.id,
                                    })
                              }
                              className="ml-auto"
                            >
                              <Flag
                                size={12}
                                strokeWidth={1.5}
                                className={
                                  reportedIds.has(`comment_${comment.id}`)
                                    ? 'text-error fill-error'
                                    : 'text-text-muted'
                                }
                              />
                            </button>
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
        )}
      </div>

      {/* 댓글 입력 (하단 고정, 수정 모드에서는 숨김) */}
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
          deleteModal?.type === 'post'
            ? '게시글을 삭제하시겠습니까?\n좋아요와 댓글도 모두 삭제됩니다.\n관리자가 복구할 수 있습니다.'
            : '댓글을 삭제하시겠습니까?\n관리자가 복구할 수 있습니다.'
        }
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal(null)}
      />
      {/* 신고 모달 */}
      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSuccess={handleReportSuccess}
        onBlock={() => {
          window.dispatchEvent(new Event('feed-refresh'));
          navigate(-1);
        }}
        targetType={reportTarget?.type || 'post'}
        targetId={reportTarget?.id || 0}
        targetUserId={reportTarget?.userId}
      />
    </FullHeightBox>
  );
}
