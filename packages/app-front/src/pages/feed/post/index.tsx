import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { postApi } from '@/api/postApi';
import { contentLimit } from '@/config/define';

// 피드 글쓰기 페이지
export default function FeedWritePage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 선택 (웹 브라우저 input / 네이티브 브릿지 공통)
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

  // 네이티브 브릿지: 이미지 선택 결과 수신
  const addImagesRef = useRef(addImages);

  useEffect(() => {
    addImagesRef.current = addImages;
  }, [addImages]);

  useEffect(() => {
    window.__onImagesPicked = pickedImages => {
      // base64 → File 변환
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

  // 사진 버튼 클릭: 네이티브 → 폴백 웹 input
  const handlePickImages = useCallback(() => {
    const remaining = 10 - images.length;
    if (remaining <= 0) return;

    // iOS 네이티브
    if (window.webkit?.messageHandlers?.pickImages) {
      window.webkit.messageHandlers.pickImages.postMessage(remaining);
      return;
    }
    // Android 네이티브
    if (window.AndroidBridge?.pickImages) {
      window.AndroidBridge.pickImages(remaining);
      return;
    }
    // 웹 브라우저 폴백
    fileInputRef.current?.click();
  }, [images.length]);

  // 웹 브라우저 파일 선택 (폴백)
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(Array.from(e.target.files || []));
    e.target.value = '';
  };

  // 이미지 삭제
  const handleImageRemove = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 게시: presign → S3 업로드 → 게시글 저장
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setIsSubmitting(true);
    try {
      let mediaKeys: string[] = [];

      // 이미지가 있으면 Presigned URL로 S3 직접 업로드
      if (images.length > 0) {
        const filesMeta = images.map(f => ({
          filename: f.name,
          contentType: f.type,
        }));
        const { data: presigned } = await postApi.presignImages(filesMeta);

        // S3에 병렬 업로드
        await Promise.all(
          presigned.map((item, i) =>
            postApi.uploadToS3(item.presignedUrl, images[i]),
          ),
        );

        mediaKeys = presigned.map(item => item.key);
      }

      // 게시글 저장
      await postApi.createPost(content.trim(), mediaKeys);
      window.dispatchEvent(new Event('feed-refresh'));
      navigate(-1);
    } catch (err) {
      console.error('[게시 실패]', err);
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    (content.trim().length > 0 || images.length > 0) && !isSubmitting;

  // 헤더 우측 게시 버튼
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
      <SubPageHeader title="글쓰기" right={submitButton} />
      <div className="scrollInner">
        {/* 본문 입력 */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={contentLimit.postMaxLength}
          className="w-full min-h-[200px] bg-transparent text-[15px] text-text placeholder-text-muted resize-none outline-none mt-2"
          placeholder="무엇을 공유하고 싶으신가요?"
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

        {/* 사진 첨부 영역 */}
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

        {/* 숨겨진 파일 입력 (웹 브라우저 폴백) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </FullHeightBox>
  );
}
