import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  CornerDownRight,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import RainbowTipCard from '@/components/common/RainbowTipCard';
import ConfirmModal from '@/components/common/ConfirmModal';
import { suggestionApi } from '@/api/suggestionApi';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/util/dateUtil';

interface SuggestionComment {
  id: number;
  userId: number | null;
  content: string;
  createdAt: string;
}

interface Suggestion {
  id: number;
  userId: number | null;
  content: string;
  createdAt: string;
  comments: SuggestionComment[];
}

// 개선요청 페이지 (익명 제안 + 아코디언 + 댓글)
export default function SuggestionsPage() {
  const currentUser = useAuthStore(s => s.user);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 제안 입력
  const [showInput, setShowInput] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 수정 상태
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // 삭제 모달
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 댓글 수정/삭제
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);

  // 댓글 입력
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<number | null>(
    null,
  );

  // 목록 조회
  const fetchList = () => {
    suggestionApi
      .getAll()
      .then(res => setSuggestions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  // 입력창 열릴 때 포커스
  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showInput]);

  // 제안 제출
  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await suggestionApi.create(content.trim());
      setContent('');
      setShowInput(false);
      fetchList();
    } catch {
      // 에러 무시
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 제출
  // 수정 저장
  const handleEditSave = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await suggestionApi.update(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
      fetchList();
    } catch {
      // 에러 무시
    }
  };

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await suggestionApi.delete(deleteId);
      setDeleteId(null);
      setExpandedId(null);
      fetchList();
    } catch {
      // 에러 무시
    }
  };

  // 댓글 수정 저장
  const handleCommentEditSave = async () => {
    if (!editingCommentId || !editCommentContent.trim()) return;
    try {
      await suggestionApi.updateComment(
        editingCommentId,
        editCommentContent.trim(),
      );
      setEditingCommentId(null);
      setEditCommentContent('');
      fetchList();
    } catch {
      // 에러 무시
    }
  };

  // 댓글 삭제 확인
  const handleCommentDeleteConfirm = async () => {
    if (!deleteCommentId) return;
    try {
      await suggestionApi.deleteComment(deleteCommentId);
      setDeleteCommentId(null);
      fetchList();
    } catch {
      // 에러 무시
    }
  };

  const handleCommentSubmit = async (suggestionId: number) => {
    const text = commentTexts[suggestionId]?.trim();
    if (!text || commentSubmitting !== null) return;
    setCommentSubmitting(suggestionId);
    try {
      await suggestionApi.createComment(suggestionId, text);
      setCommentTexts(prev => ({ ...prev, [suggestionId]: '' }));
      fetchList();
    } catch {
      // 에러 무시
    } finally {
      setCommentSubmitting(null);
    }
  };

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="개선요청" />
      <div className="scrollInner">
        {/* 제안하기 버튼 / 입력 영역 */}
        <div className="mb-5">
          {/* 안내 카드 */}
          <div className="mb-3">
            <RainbowTipCard>
              앱에 있으면 하는 기능이나 개선사항을 자유롭게 요청해 주세요.
              빠르게 반영하겠습니다.
            </RainbowTipCard>
          </div>

          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-3 bg-accent text-white font-bold text-[14px] rounded-[12px] active:scale-[0.98] transition-colors duration-150"
            >
              제안하기
            </button>
          ) : null}

          {showInput && (
            <div className="mt-3 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-4">
              <textarea
                ref={inputRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="개선이 필요한 점을 자유롭게 적어주세요 (익명)"
                maxLength={2000}
                className="w-full min-h-[100px] text-[14px] text-text bg-surface rounded-[8px] p-3 resize-none outline-none placeholder:text-text-muted"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowInput(false);
                    setContent('');
                  }}
                  className="px-4 py-2 text-[13px] font-bold text-text-muted rounded-[8px] hover:bg-surface transition-colors duration-150"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className="px-4 py-2 text-[13px] font-bold text-white bg-accent rounded-[8px] disabled:opacity-40 active:scale-[0.98] transition-colors duration-150"
                >
                  {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="py-8 text-center text-text-muted text-[14px]">
            불러오는 중...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-[14px]">
            아직 개선요청이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {suggestions.map(item => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  {/* 아코디언 헤더 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-text truncate">
                        {item.content}
                      </p>
                      <p className="text-[12px] text-text-muted mt-0.5">
                        {formatRelativeTime(item.createdAt)}
                        {item.comments.length > 0 && (
                          <span className="ml-2 text-accent font-medium">
                            댓글 {item.comments.length}
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-text-muted flex-shrink-0 ml-2 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 아코디언 본문 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-surface">
                      {/* 원글 내용 (음영 배경) */}
                      <div className="mt-3 bg-surface rounded-[8px] px-3 py-2.5">
                        {editingId === item.id ? (
                          <>
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              maxLength={2000}
                              className="w-full min-h-[80px] text-[14px] text-text bg-white border border-[#CED4DA] rounded-[8px] p-2.5 resize-none outline-none"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 text-[12px] font-semibold text-text-muted rounded-[8px] hover:bg-white"
                              >
                                취소
                              </button>
                              <button
                                onClick={handleEditSave}
                                className="px-3 py-1.5 text-[12px] font-semibold text-white bg-accent rounded-[8px]"
                              >
                                저장
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-[14px] text-text leading-[1.7] whitespace-pre-wrap">
                              {item.content}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[11px] text-text-muted">
                                {formatRelativeTime(item.createdAt)}
                              </p>
                              {currentUser &&
                                String(item.userId) ===
                                  String(currentUser.id) && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingId(item.id);
                                        setEditContent(item.content);
                                      }}
                                      className="text-text-muted hover:text-text"
                                    >
                                      <Pencil size={13} strokeWidth={1.5} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteId(item.id)}
                                      className="text-text-muted hover:text-error"
                                    >
                                      <Trash2 size={13} strokeWidth={1.5} />
                                    </button>
                                  </div>
                                )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 댓글 목록 */}
                      {item.comments.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {item.comments.map(comment => {
                            const isMyComment =
                              currentUser &&
                              String(comment.userId) === String(currentUser.id);
                            const isEditingComment =
                              editingCommentId === comment.id;
                            return (
                              <div
                                key={comment.id}
                                className="flex items-start gap-1.5 pl-2"
                              >
                                <CornerDownRight
                                  size={14}
                                  strokeWidth={1.5}
                                  className="text-text-muted flex-shrink-0 mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  {isEditingComment ? (
                                    <div>
                                      <input
                                        type="text"
                                        value={editCommentContent}
                                        onChange={e =>
                                          setEditCommentContent(e.target.value)
                                        }
                                        onKeyDown={e => {
                                          if (
                                            e.key === 'Enter' &&
                                            !e.nativeEvent.isComposing
                                          )
                                            handleCommentEditSave();
                                        }}
                                        maxLength={500}
                                        className="w-full text-[13px] text-text bg-white border border-[#CED4DA] rounded-[6px] px-2 py-1.5 outline-none"
                                      />
                                      <div className="flex justify-end gap-1.5 mt-1">
                                        <button
                                          onClick={() =>
                                            setEditingCommentId(null)
                                          }
                                          className="px-2 py-1 text-[11px] text-text-muted"
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={handleCommentEditSave}
                                          className="px-2 py-1 text-[11px] text-white bg-accent rounded"
                                        >
                                          저장
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-[13px] text-text">
                                        {comment.content}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[11px] text-text-muted">
                                          {formatRelativeTime(
                                            comment.createdAt,
                                          )}
                                        </p>
                                        {isMyComment && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setEditingCommentId(comment.id);
                                                setEditCommentContent(
                                                  comment.content,
                                                );
                                              }}
                                              className="text-text-muted hover:text-text"
                                            >
                                              <Pencil
                                                size={11}
                                                strokeWidth={1.5}
                                              />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setDeleteCommentId(comment.id)
                                              }
                                              className="text-text-muted hover:text-error"
                                            >
                                              <Trash2
                                                size={11}
                                                strokeWidth={1.5}
                                              />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 댓글 입력 */}
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={commentTexts[item.id] || ''}
                          onChange={e =>
                            setCommentTexts(prev => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          onKeyDown={e => {
                            if (
                              e.key === 'Enter' &&
                              !e.nativeEvent.isComposing
                            ) {
                              handleCommentSubmit(item.id);
                            }
                          }}
                          placeholder="의견을 남겨주세요"
                          maxLength={500}
                          className="flex-1 text-[13px] text-text bg-white border border-[#CED4DA] rounded-[8px] px-3 py-2 outline-none placeholder:text-text-muted"
                        />
                        <button
                          onClick={() => handleCommentSubmit(item.id)}
                          disabled={
                            !commentTexts[item.id]?.trim() ||
                            commentSubmitting === item.id
                          }
                          className="w-8 h-8 flex items-center justify-center text-accent disabled:opacity-30"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* 제안 삭제 확인 모달 */}
      <ConfirmModal
        open={!!deleteId}
        message="개선요청을 삭제하시겠습니까? 댓글도 함께 삭제됩니다."
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
      {/* 댓글 삭제 확인 모달 */}
      <ConfirmModal
        open={!!deleteCommentId}
        message="댓글을 삭제하시겠습니까?"
        confirmText="삭제"
        onConfirm={handleCommentDeleteConfirm}
        onCancel={() => setDeleteCommentId(null)}
      />
    </FullHeightBox>
  );
}
