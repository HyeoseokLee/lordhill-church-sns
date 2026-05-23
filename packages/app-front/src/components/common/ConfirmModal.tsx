import Dialog from '@mui/material/Dialog';

interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

// 공통 확인 모달 (삭제 등 위험 작업 전 경고용)
export default function ConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
  confirmText = '확인',
  cancelText = '취소',
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
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
      <p className="text-[15px] text-text text-center leading-relaxed whitespace-pre-wrap">
        {message}
      </p>
      <div className="flex gap-2 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-[14px] font-semibold text-text-muted bg-surface rounded-[10px] hover:bg-surface-strong transition-colors duration-150"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 text-[14px] font-semibold text-white bg-error rounded-[10px] hover:opacity-90 transition-colors duration-150"
        >
          {confirmText}
        </button>
      </div>
    </Dialog>
  );
}
