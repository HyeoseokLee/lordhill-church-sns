import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { recycleApi } from '@/api/recycleApi';
import { contentLimit } from '@/config/define';

// 돌고래 글쓰기 페이지
export default function RecyclePostPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 추가
  const addImages = useCallback(
    (files: File[]) => {
      const remaining = 10 - images.length;
      const selected = files.slice(0, remaining);
      if (selected.length === 0) return;
      setImages(prev => [...prev, ...selected]);
      setPreviews(prev => [
        ...prev,
        ...selected.map(f => URL.createObjectURL(f)),
      ]);
    },
    [images.length],
  );

  // 네이티브 브릿지 수신
  const addImagesRef = useRef(addImages);
  useEffect(() => {
    addImagesRef.current = addImages;
  }, [addImages]);

  useEffect(() => {
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
      addImagesRef.current(files);
    };
    return () => {
      delete window.__onImagesPicked;
    };
  }, []);

  // 사진 버튼
  const handlePickImages = useCallback(() => {
    const remaining = 10 - images.length;
    if (remaining <= 0) return;
    if (window.webkit?.messageHandlers?.pickImages) {
      window.webkit.messageHandlers.pickImages.postMessage(remaining);
      return;
    }
    if (window.AndroidBridge?.pickImages) {
      window.AndroidBridge.pickImages(remaining);
      return;
    }
    fileInputRef.current?.click();
  }, [images.length]);

  const handleImageRemove = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 게시
  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      let mediaKeys: string[] = [];
      if (images.length > 0) {
        const filesMeta = images.map(f => ({
          filename: f.name,
          contentType: f.type,
        }));
        const { data: presigned } = await recycleApi.presignImages(filesMeta);
        await Promise.all(
          presigned.map((item: any, i: number) =>
            recycleApi.uploadToS3(item.presignedUrl, images[i]),
          ),
        );
        mediaKeys = presigned.map((item: any) => item.key);
      }
      await recycleApi.create(title.trim(), content.trim(), mediaKeys);
      window.dispatchEvent(new Event('recycle-refresh'));
      navigate(-1);
    } catch (err) {
      console.error('[돌고래 게시 실패]', err);
      setIsSubmitting(false);
    }
  };

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  const submitButton = (
    <button
      onClick={handleSubmit}
      disabled={!canSubmit}
      className={`px-4 py-1.5 font-bold text-[14px] rounded-[10px] transition-colors duration-150 active:scale-[0.98] ${
        canSubmit
          ? 'bg-accent text-white hover:bg-accent-dark'
          : 'bg-surface text-text-muted cursor-not-allowed'
      }`}
    >
      {isSubmitting ? '게시 중...' : '게시'}
    </button>
  );

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="나눔 등록" right={submitButton} />
      <div className="scrollInner">
        {/* 제목 */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={200}
          placeholder="제목을 입력하세요"
          className="w-full text-[16px] font-bold text-text placeholder-text-muted outline-none mt-2 pb-3 border-b border-surface"
        />
        {/* 내용 */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={contentLimit.postMaxLength}
          className="w-full min-h-[150px] bg-transparent text-[15px] text-text placeholder-text-muted resize-none outline-none mt-3"
          placeholder="공유하고 싶은 물품을 설명해주세요"
        />
        {/* 이미지 미리보기 */}
        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-4">
            {previews.map((src, i) => (
              <div
                key={src}
                className="relative w-20 h-20 rounded-[8px] overflow-hidden"
              >
                <img
                  src={src}
                  alt={`첨부 ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleImageRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* 사진 첨부 */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handlePickImages}
            disabled={images.length >= 10}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface rounded-[12px] text-text-muted text-[13px] font-semibold hover:bg-surface-strong transition-colors duration-150 disabled:opacity-40"
          >
            <ImagePlus size={18} strokeWidth={1.5} />
            사진 {images.length > 0 && `${images.length}/10`}
          </button>
          <span className="text-[12px] text-text-muted">
            사진은 최대 10장까지 가능해요!
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => {
            addImages(Array.from(e.target.files || []));
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>
    </FullHeightBox>
  );
}
