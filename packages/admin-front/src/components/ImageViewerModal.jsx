import Dialog from '@mui/material/Dialog';

// 이미지 전체보기 모달
export default function ImageViewerModal({ open, imageUrl, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
          },
        },
        backdrop: {
          sx: { backgroundColor: 'rgba(0,0,0,0.85)' },
        },
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onClick={onClose}
          className="max-w-full max-h-[90vh] object-contain cursor-pointer"
        />
      )}
    </Dialog>
  );
}
