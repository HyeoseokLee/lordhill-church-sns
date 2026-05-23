import Dialog from '@mui/material/Dialog';

// 공통 확인 모달 (삭제 등 위험 작업 전 경고용)
export default function ConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
  confirmText = '확인',
  cancelText = '취소',
  confirmColor = 'red',
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            padding: '24px',
            minWidth: '300px',
            maxWidth: '360px',
          },
        },
      }}
    >
      <p className="text-sm text-gray-700 text-center whitespace-pre-wrap">
        {message}
      </p>
      <div className="flex gap-2 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-2 text-sm font-medium text-white rounded-lg ${confirmColor === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {confirmText}
        </button>
      </div>
    </Dialog>
  );
}
