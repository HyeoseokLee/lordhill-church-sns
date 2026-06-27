import { useState } from 'react';
import toast from 'react-hot-toast';
import Dialog from '@mui/material/Dialog';
import {
  reportApi,
  type ReportTargetType,
  type ReportReason,
} from '@/api/reportApi';
import { blockApi } from '@/api/blockApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onBlock?: () => void;
  targetType: ReportTargetType;
  targetId: number;
  targetUserId?: number;
}

// 신고 사유 옵션
const reasonOptions: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '스팸/광고' },
  { value: 'abuse', label: '욕설/비방' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'other', label: '기타' },
];

// 신고 + 차단 모달
export default function ReportModal({
  open,
  onClose,
  onSuccess,
  onBlock,
  targetType,
  targetId,
  targetUserId,
}: Props) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (reason: ReportReason) => {
    if (reason === 'other') {
      setSelected('other');
      return;
    }
    await submitReport(reason);
  };

  const submitReport = async (reason: ReportReason, text?: string) => {
    setLoading(true);
    try {
      await reportApi.create({
        targetType,
        targetId,
        reason,
        detail: text?.trim() || undefined,
      });
      toast.success('신고가 접수되었습니다.');
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || '신고에 실패했습니다.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 차단 처리
  const handleBlock = async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      await blockApi.block(targetUserId);
      toast.success(
        '사용자를 차단했습니다.\n해당 사용자의 글이 더 이상 표시되지 않습니다.',
      );
      onBlock?.();
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || '차단에 실패했습니다.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelected(null);
    setDetail('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            padding: '24px',
            minWidth: '280px',
            maxWidth: '320px',
          },
        },
      }}
    >
      <h3 className="text-[16px] font-bold text-text text-center mb-4">
        신고 사유 선택
      </h3>

      {selected === 'other' ? (
        // 기타 사유 입력 모드
        <div>
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="신고 사유를 입력해주세요"
            maxLength={500}
            autoFocus
            className="w-full min-h-[100px] bg-surface rounded-[10px] p-3 text-[14px] text-text placeholder-text-muted resize-none outline-none"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setSelected(null)}
              disabled={loading}
              className="flex-1 py-2.5 text-[14px] font-semibold text-text-muted bg-surface rounded-[10px] transition-colors duration-150"
            >
              뒤로
            </button>
            <button
              onClick={() => submitReport('other', detail)}
              disabled={loading || !detail.trim()}
              className={`flex-1 py-2.5 text-[14px] font-semibold rounded-[10px] transition-colors duration-150 ${
                detail.trim()
                  ? 'text-white bg-error'
                  : 'text-text-muted bg-surface-strong cursor-not-allowed'
              }`}
            >
              {loading ? '처리 중...' : '신고하기'}
            </button>
          </div>
        </div>
      ) : (
        // 사유 선택 버튼 리스트
        <div className="flex flex-col gap-2">
          {reasonOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleSubmit(option.value)}
              disabled={loading}
              className="w-full py-3 text-[14px] text-text bg-surface rounded-[10px] hover:bg-surface-strong transition-colors duration-150"
            >
              {option.label}
            </button>
          ))}
          {/* 사용자 차단 버튼 */}
          {targetUserId && (
            <button
              onClick={handleBlock}
              disabled={loading}
              className="w-full py-3 text-[14px] text-error font-medium bg-red-50 rounded-[10px] hover:bg-red-100 transition-colors duration-150"
            >
              이 사용자 차단
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-full py-2.5 mt-1 text-[13px] text-text-muted"
          >
            취소
          </button>
        </div>
      )}
    </Dialog>
  );
}
