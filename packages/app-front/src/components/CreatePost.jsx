import { useState, useRef } from 'react';
import api from '../lib/api';

export default function CreatePost({ onClose, onCreated }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 10) {
      alert('최대 10장까지 첨부할 수 있습니다.');
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach((f) => formData.append('images', f));

      await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      onCreated();
    } catch (err) {
      alert(err.response?.data?.error || '게시에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (content.trim() || files.length > 0) {
        if (!confirm('작성 중인 내용이 사라집니다. 나가시겠습니까?')) return;
      }
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={onClose} className="text-gray-500">
            취소
          </button>
          <span className="font-bold">새 게시물</span>
          <button
            onClick={handleSubmit}
            disabled={uploading || (!content.trim() && files.length === 0)}
            className="text-blue-600 font-medium disabled:text-gray-300"
          >
            {uploading ? '게시 중...' : '게시'}
          </button>
        </div>

        {/* 본문 입력 */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="무슨 이야기를 나누고 싶으신가요?"
            maxLength={2000}
            rows={5}
            className="w-full resize-none focus:outline-none text-sm"
          />
          <div className="text-right text-xs text-gray-400">{content.length}/2000</div>
        </div>

        {/* 이미지 미리보기 */}
        {files.length > 0 && (
          <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
            {files.map((f, i) => (
              <div key={i} className="relative flex-shrink-0 w-20 h-20">
                <img
                  src={URL.createObjectURL(f)}
                  className="w-20 h-20 object-cover rounded"
                  alt=""
                />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 업로드 진행 */}
        {uploading && (
          <div className="px-4 pb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">{progress}%</p>
          </div>
        )}

        {/* 사진 첨부 버튼 */}
        <div className="px-4 py-3 border-t">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-gray-500 text-sm flex items-center gap-2"
          >
            📷 사진 추가 ({files.length}/10)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
}
