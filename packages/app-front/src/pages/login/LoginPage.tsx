import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/config/define';
import { MessageCircle } from 'lucide-react';
import logoImg from '@/assets/images/img_logo3.png';

// OAuth 프로바이더 정의
const OAUTH_PROVIDERS = [
  {
    name: 'Google',
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
    url: '/api/auth/naver',
    label: 'Naver로 계속하기',
    className: 'bg-[#03C75A] hover:brightness-95',
    textClassName: 'text-white',
    icon: <span className="font-black text-white text-xl">N</span>,
  },
];

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();

  // 이미 로그인된 상태면 홈으로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // OAuth 로그인은 서버로 직접 리다이렉트
  const handleLogin = (url: string) => {
    window.location.assign(`${API_BASE_URL}${url}`);
  };

  return (
    <div className="bg-bg min-h-screen flex items-center justify-center overflow-x-hidden">
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
          <h1 className="text-[28px] font-extrabold tracking-tight text-text">
            손안의 교회
          </h1>
          <p className="mt-2 text-[15px] font-medium text-text-muted">
            Lordhill Church SNS
          </p>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="w-full space-y-3">
          {OAUTH_PROVIDERS.map(provider => (
            <button
              key={provider.name}
              onClick={() => handleLogin(provider.url)}
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
          ))}
        </div>

        {/* 하단 푸터 */}
        <footer className="mt-12 text-center">
          <p className="text-[10px] text-text-muted leading-relaxed px-8 opacity-60">
            계속 진행하면 손안의 교회 SNS의
            <br />
            이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </footer>
      </main>
    </div>
  );
}
