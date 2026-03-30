export default function LoginPage() {
  const handleGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">로드힐 교회 관리자</h1>
        <p className="text-gray-500 text-sm mb-8">관리자 계정으로 로그인하세요</p>
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          Google로 로그인
        </button>
      </div>
    </div>
  );
}
