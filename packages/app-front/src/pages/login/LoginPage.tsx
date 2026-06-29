import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';
import { API_BASE_URL } from '@/config/define';
import { MessageCircle } from 'lucide-react';
import logoImg from '@/assets/images/img_logo3.png';

// OAuth 프로바이더 정의
const OAUTH_PROVIDERS = [
  {
    name: 'Google',
    key: 'google',
    url: '/api/auth/google',
    label: 'Google로 계속하기',
    className: 'bg-surface hover:bg-surface-strong',
    textClassName: 'text-text-muted group-hover:text-text',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    name: 'Kakao',
    key: 'kakao',
    url: '/api/auth/kakao',
    label: 'Kakao로 계속하기',
    className: 'bg-[#FEE500] hover:brightness-95',
    textClassName: 'text-[#3C1E1E]',
    icon: (
      <MessageCircle size={20} strokeWidth={2} className="text-[#3C1E1E]" />
    ),
  },
  {
    name: 'Naver',
    key: 'naver',
    url: '/api/auth/naver',
    label: 'Naver로 계속하기',
    className: 'bg-[#03C75A] hover:brightness-95',
    textClassName: 'text-white',
    icon: <span className="font-black text-white text-xl">N</span>,
  },
  {
    name: 'Apple',
    key: 'apple',
    url: '/api/auth/apple',
    label: 'Apple로 계속하기',
    className: 'bg-black hover:bg-gray-900',
    textClassName: 'text-white',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
];

// 서버에서 리다이렉트된 에러 코드별 메시지
const ERROR_MESSAGES: Record<string, string> = {
  account_locked: '계정이 잠겨있습니다. 관리자에게 문의하세요.',
  account_deleted: '삭제된 계정입니다. 관리자에게 문의하세요.',
  oauth_failed: '소셜 로그인에 실패했습니다. 다시 시도해주세요.',
};

// localStorage에서 최근 로그인 프로바이더 조회
const getLastProvider = () => localStorage.getItem('lastProvider') || '';

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const setUser = useAuthStore(s => s.setUser);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 심사용 로그인 상태
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewPassword, setReviewPassword] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // URL 쿼리에서 에러 메시지 감지 (초기값으로 처리)
  const errorParam = searchParams.get('error');
  const initialError = errorParam ? ERROR_MESSAGES[errorParam] || '' : '';
  const [errorMessage, setErrorMessage] = useState(initialError);

  // 다른 소셜 로그인 경고 모달
  const [pendingProvider, setPendingProvider] = useState<
    (typeof OAUTH_PROVIDERS)[number] | null
  >(null);

  const lastProvider = getLastProvider();

  // 모달 닫기 시 URL 쿼리도 정리
  const handleCloseError = () => {
    setErrorMessage('');
    if (searchParams.has('error')) {
      setSearchParams({}, { replace: true });
    }
  };

  // 이미 로그인된 상태면 홈으로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // OAuth 로그인 처리
  const handleLogin = (provider: (typeof OAUTH_PROVIDERS)[number]) => {
    // 최근 로그인 기록이 있고, 다른 소셜을 눌렀으면 경고
    if (lastProvider && lastProvider !== provider.key) {
      setPendingProvider(provider);
      return;
    }
    window.location.assign(`${API_BASE_URL}${provider.url}`);
  };

  // 경고 확인 후 로그인 진행
  const handleConfirmDifferentLogin = () => {
    if (pendingProvider) {
      const url = pendingProvider.url;
      setPendingProvider(null);
      window.location.assign(`${API_BASE_URL}${url}`);
    }
  };

  const lastProviderName =
    OAUTH_PROVIDERS.find(p => p.key === lastProvider)?.name || '';

  return (
    <div className="bg-bg fixed inset-0 flex items-center justify-center overflow-x-hidden overflow-y-auto">
      <main className="w-full max-w-[480px] px-6 py-12 flex flex-col items-center">
        {/* 앱 아이덴티티 */}
        <div className="mb-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 mb-6 rounded-[12px] overflow-hidden">
            <img
              src={logoImg}
              alt="손안의 교회"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="w-full space-y-3">
          {OAUTH_PROVIDERS.filter(
            p => p.key !== 'apple' || !!window.isIOSApp,
          ).map(provider => (
            <div key={provider.name} className="relative">
              <button
                onClick={() => handleLogin(provider)}
                className={`w-full flex items-center justify-center gap-3 py-[14px] px-6 rounded-[12px] transition-all duration-150 ease-out active:scale-[0.98] group ${provider.className}`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {provider.icon}
                </div>
                <span
                  className={`font-semibold text-[15px] ${provider.textClassName}`}
                >
                  {provider.label}
                </span>
              </button>
              {/* 최근 로그인 뱃지 */}
              {lastProvider === provider.key && (
                <span className="absolute -top-2 right-3 bg-white text-accent text-[10px] font-bold px-2 py-0.5 rounded-full border border-accent">
                  최근 로그인
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 심사용 로그인 */}
        <div className="w-full mt-10 pt-6 border-t border-surface">
          <p className="text-[11px] text-text-muted mb-3 text-center">
            심사용 로그인
          </p>
          <input
            type="email"
            value={reviewEmail}
            onChange={e => setReviewEmail(e.target.value)}
            placeholder="이메일"
            className="w-full px-4 py-3 bg-surface rounded-[10px] text-[14px] text-text placeholder-text-muted outline-none mb-2"
          />
          <input
            type="password"
            value={reviewPassword}
            onChange={e => setReviewPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-3 bg-surface rounded-[10px] text-[14px] text-text placeholder-text-muted outline-none mb-3"
          />
          <button
            onClick={async () => {
              if (!reviewEmail || !reviewPassword) return;
              setReviewLoading(true);
              try {
                const res = await authApi.reviewLogin(
                  reviewEmail,
                  reviewPassword,
                );
                localStorage.setItem('accessToken', res.data.accessToken);
                const me = await authApi.getMe();
                setUser(me.data);
                navigate('/feed', { replace: true });
              } catch {
                setErrorMessage('로그인에 실패했습니다.');
              } finally {
                setReviewLoading(false);
              }
            }}
            disabled={reviewLoading}
            className="w-full py-3 bg-surface-strong text-text-muted font-semibold text-[14px] rounded-[10px] active:scale-[0.98] transition-all duration-150"
          >
            {reviewLoading ? '로그인 중...' : '로그인'}
          </button>
        </div>

        {/* 하단 푸터 */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] text-text-muted leading-relaxed px-8 opacity-60">
            계속 진행하면 손안의 교회 SNS의
            <br />
            이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </footer>
      </main>

      {/* 계정 잠금 등 에러 모달 */}
      <Dialog open={!!errorMessage} onClose={handleCloseError}>
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-[17px] font-bold text-text mb-3">로그인 불가</h3>
          <p className="text-[14px] text-text-muted">{errorMessage}</p>
          <div className="mt-5">
            <button
              onClick={handleCloseError}
              className="w-full px-5 py-2.5 bg-accent text-white font-bold text-[14px] rounded-[12px] hover:bg-accent-dark active:scale-[0.98] transition-colors duration-150"
            >
              확인
            </button>
          </div>
        </div>
      </Dialog>

      {/* 다른 소셜 로그인 경고 모달 */}
      <Dialog open={!!pendingProvider} onClose={() => setPendingProvider(null)}>
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-[17px] font-bold text-text mb-3">
            다른 계정으로 로그인
          </h3>
          <p className="text-[14px] text-[#171717]">
            이미 {lastProviderName}으로 가입한 계정이 있습니다.
          </p>
          <p className="text-[14px] text-[#171717] mt-2">
            {pendingProvider?.name}으로 로그인하면 새로운 계정이 생성됩니다.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setPendingProvider(null)}
              className="flex-1 px-5 py-2.5 bg-white text-accent font-bold text-[14px] rounded-[12px] border border-accent hover:bg-accent-light active:scale-[0.98] transition-colors duration-150"
            >
              취소
            </button>
            <button
              onClick={handleConfirmDifferentLogin}
              className="flex-1 px-5 py-2.5 bg-accent text-white font-bold text-[14px] rounded-[12px] hover:bg-accent-dark active:scale-[0.98] transition-colors duration-150"
            >
              계속하기
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
