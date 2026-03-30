import useAuthStore from '../stores/authStore';

export default function PendingPage() {
  const { user, logout, fetchUser } = useAuthStore();

  const handleRetry = () => {
    fetchUser();
  };

  if (user?.status === 'REJECTED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="text-5xl mb-4">😔</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">가입이 거절되었습니다</h2>
        <p className="text-gray-500 mb-6">관리자에게 문의해주세요.</p>
        <button onClick={logout} className="text-blue-600 hover:underline">
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">가입 신청이 완료되었습니다</h2>
      <p className="text-gray-500 mb-6">관리자 승인을 기다려주세요.</p>
      <div className="space-x-4">
        <button onClick={handleRetry} className="text-blue-600 hover:underline">
          상태 확인
        </button>
        <button onClick={logout} className="text-gray-400 hover:underline">
          로그아웃
        </button>
      </div>
    </div>
  );
}
