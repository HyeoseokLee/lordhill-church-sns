import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Pencil, X, Check, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';
import { userApi } from '@/api/userApi';
import ConfirmModal from '@/components/common/ConfirmModal';

// 마이페이지 메인
export default function MyPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const logout = useAuthStore(s => s.logout);
  const [uploading, setUploading] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const addImageRef = useRef<((file: File) => void) | null>(null);

  // 프로필 이미지 업로드 (multer 방식)
  const handleProfileImageUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('profileImage', file);
        const res = await userApi.updateProfile(formData);
        setUser(res.data);
      } catch (err) {
        console.error('프로필 이미지 업로드 실패:', err);
      } finally {
        setUploading(false);
      }
    },
    [setUser],
  );

  // 네이티브 이미지 선택 콜백 등록
  useEffect(() => {
    addImageRef.current = handleProfileImageUpload;

    window.__onImagesPicked = (
      images: { base64: string; filename: string; contentType: string }[],
    ) => {
      if (images.length > 0) {
        const img = images[0];
        // base64 문자열에서 줄바꿈/공백/data URL prefix 제거
        const cleanBase64 = img.base64
          .replace(/^data:[^;]+;base64,/, '')
          .replace(/\s/g, '');
        const byteString = atob(cleanBase64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const file = new File([ab], img.filename, { type: img.contentType });
        addImageRef.current?.(file);
      }
    };

    return () => {
      delete window.__onImagesPicked;
    };
  }, [handleProfileImageUpload]);

  // 프로필 사진 변경 버튼 클릭
  const handlePickImage = () => {
    const isIOS = !!(window as any).webkit?.messageHandlers?.pickImages;
    const isAndroid = !!(window as any).AndroidBridge?.pickImages;

    if (isIOS) {
      (window as any).webkit.messageHandlers.pickImages.postMessage(1);
    } else if (isAndroid) {
      (window as any).AndroidBridge.pickImages(1);
    } else {
      // 웹 브라우저 폴백
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleProfileImageUpload(file);
      };
      input.click();
    }
  };

  // 닉네임 수정 시작
  const startEditNickname = () => {
    setNicknameInput(currentUser?.name || '');
    setEditingNickname(true);
  };

  // 닉네임 수정 취소
  const cancelEditNickname = () => {
    setEditingNickname(false);
    setNicknameInput('');
  };

  // 닉네임 저장
  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === currentUser?.name) {
      cancelEditNickname();
      return;
    }
    setNicknameSaving(true);
    try {
      const formData = new FormData();
      formData.append('nickname', trimmed);
      const res = await userApi.updateProfile(formData);
      setUser(res.data);
      setEditingNickname(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || '닉네임 변경에 실패했습니다.';
      alert(msg);
    } finally {
      setNicknameSaving(false);
    }
  };

  // 회원 탈퇴 모달
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  // 회원 탈퇴
  const handleDeleteAccount = async () => {
    try {
      await userApi.deleteAccount();
      logout();
      navigate('/login', { replace: true });
    } catch {
      alert('회원 탈퇴에 실패했습니다.');
    }
    setDeleteAccountModal(false);
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 서버 로그아웃 실패해도 클라이언트는 정리
    }
    logout();
    navigate('/login', { replace: true });
  };

  const profileImage = currentUser?.profileImage;
  const userName = currentUser?.name || '사용자';

  return (
    <>
      {/* 상단 헤더 */}
      <header className="w-full flex items-center justify-between py-4 px-5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          마이페이지
        </h1>
      </header>

      {/* 스크롤 영역 */}
      <div className="scrollInner">
        {/* 프로필 영역 */}
        <div className="flex flex-col items-center pt-4 pb-6">
          {/* 아바타 + 수정 버튼 */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-surface">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[36px] font-bold text-text-muted">
                  {userName.charAt(0)}
                </div>
              )}
            </div>
            {/* 카메라 수정 버튼 (우하단) */}
            <button
              onClick={handlePickImage}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-md active:scale-[0.95] transition-transform duration-100"
            >
              <Camera size={16} strokeWidth={2} />
            </button>
          </div>

          {/* 닉네임 (편집 모드 전환) — 닉네임 텍스트가 항상 중앙 */}
          <div className="mt-3 relative flex items-center justify-center">
            {editingNickname ? (
              <>
                <input
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  autoFocus
                  maxLength={20}
                  className="text-[17px] font-bold text-text text-center border-b border-accent outline-none bg-transparent w-32"
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveNickname();
                    if (e.key === 'Escape') cancelEditNickname();
                  }}
                />
                <div className="absolute right-[-60px] flex items-center gap-0.5">
                  <button
                    onClick={cancelEditNickname}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-surface"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                  <button
                    onClick={saveNickname}
                    disabled={nicknameSaving}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-accent hover:bg-accent/10"
                  >
                    <Check size={16} strokeWidth={2} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[17px] font-bold text-text">{userName}</p>
                <button
                  onClick={startEditNickname}
                  className="absolute -right-8 w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-surface"
                >
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
          {/* 이메일 */}
          {currentUser?.email && (
            <p className="mt-0.5 text-[13px] text-text-muted">
              {currentUser.email}
            </p>
          )}
          {/* 로그인 provider 뱃지 */}
          {currentUser?.provider && (
            <span className="mt-1.5 inline-block text-[11px] text-text-muted bg-surface px-2.5 py-0.5 rounded-full">
              {currentUser.provider.charAt(0).toUpperCase() +
                currentUser.provider.slice(1)}{' '}
              로그인
            </span>
          )}
          {/* 업로드 중 표시 */}
          {uploading && (
            <p className="mt-2 text-[12px] text-accent">
              프로필 사진 변경 중...
            </p>
          )}
        </div>

        {/* 고객지원 섹션 */}
        <div className="mt-4">
          <p className="text-[13px] text-text-muted mb-2">고객지원</p>
          <div className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
            <button
              onClick={() => navigate('/my/notices')}
              className="w-full flex items-center justify-between py-3.5 px-4 text-[15px] text-text"
            >
              <span>공지사항</span>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
            <button
              onClick={() => navigate('/my/faq')}
              className="w-full flex items-center justify-between py-3.5 px-4 text-[15px] text-text"
            >
              <span>자주 묻는 질문</span>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
            <button
              onClick={() => navigate('/my/blocked')}
              className="w-full flex items-center justify-between py-3.5 px-4 text-[15px] text-text"
            >
              <span>차단한 사용자</span>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* 서비스 이용약관 섹션 */}
        <div className="mt-8">
          <p className="text-[13px] text-text-muted mb-2">서비스 이용약관</p>
          <div className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
            <button
              onClick={() => navigate('/my/privacy-policy')}
              className="w-full flex items-center justify-between py-3.5 px-4 text-[15px] text-text"
            >
              <span>개인정보 처리방침</span>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
            <button
              onClick={() => navigate('/my/terms-of-service')}
              className="w-full flex items-center justify-between py-3.5 px-4 text-[15px] text-text"
            >
              <span>서비스 이용약관</span>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* 로그아웃 */}
        <div className="py-2 mt-4">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-1 text-center text-[15px] text-error font-medium"
          >
            로그아웃
          </button>
        </div>

        {/* 회원 탈퇴 */}
        <div className="mt-8 mb-4">
          <button
            onClick={() => setDeleteAccountModal(true)}
            className="w-full py-2 text-center text-[12px] text-text-muted underline"
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      <ConfirmModal
        open={deleteAccountModal}
        message={
          '정말 탈퇴하시겠습니까?\n\n작성한 게시글과 댓글이 삭제되며,\n같은 계정으로 다시 로그인할 수 없습니다.'
        }
        confirmText="탈퇴하기"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountModal(false)}
      />
    </>
  );
}
