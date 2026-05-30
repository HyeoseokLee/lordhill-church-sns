import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

// OAuth 콜백 처리 — 토큰 저장 후 유저 정보 조회 → 홈 이동
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);

      // 네이티브 앱에 JWT 토큰 전달 (iOS/Android 브릿지)
      try {
        if (window.webkit?.messageHandlers?.getToken) {
          window.webkit.messageHandlers.getToken.postMessage(token);
        }
        if (window.AndroidBridge?.updateToken) {
          window.AndroidBridge.updateToken(token);
        }
      } catch {
        // 웹 브라우저에서는 무시
      }

      authApi
        .getMe()
        .then(res => {
          setUser(res.data);
          // 최근 로그인한 소셜 프로바이더 저장
          if (res.data.provider) {
            localStorage.setItem('lastProvider', res.data.provider);
          }
          navigate('/feed', { replace: true });
        })
        .catch(() => {
          navigate('/login', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="text-text-muted text-[15px]">로그인 처리 중...</div>
    </div>
  );
}
