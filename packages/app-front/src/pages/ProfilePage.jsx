import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';
import PostCard from '../components/PostCard';

export default function ProfilePage() {
  const { user, logout, fetchUser } = useAuthStore();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      api.get('/posts').then(({ data }) => {
        setPosts(data.posts.filter((p) => p.authorId === user.id));
      });
    }
  }, [user]);

  const handleSaveNickname = async () => {
    setError('');
    try {
      await api.patch('/users/me', { nickname });
      await fetchUser();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || '저장에 실패했습니다.');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await api.patch('/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchUser();
    } catch (err) {
      alert(err.response?.data?.error || '업로드에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      <div className="bg-white p-6 text-center">
        {/* 프로필 사진 */}
        <label className="cursor-pointer inline-block">
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt="프로필"
              className="w-20 h-20 rounded-full object-cover mx-auto"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto text-2xl text-gray-400">
              👤
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">탭하여 변경</p>
        </label>

        {/* 닉네임 */}
        {editing ? (
          <div className="mt-4 space-y-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="border rounded px-3 py-2 text-center w-48"
              maxLength={20}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-center gap-2">
              <button onClick={handleSaveNickname} className="text-blue-600 text-sm">
                저장
              </button>
              <button onClick={() => setEditing(false)} className="text-gray-400 text-sm">
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <h2 className="text-xl font-bold">{user?.nickname || '닉네임 없음'}</h2>
            <button onClick={() => setEditing(true)} className="text-sm text-gray-400 mt-1">
              닉네임 수정
            </button>
          </div>
        )}

        <p className="text-gray-400 text-sm mt-2">{user?.email}</p>

        <button onClick={handleLogout} className="mt-4 text-red-500 text-sm hover:underline">
          로그아웃
        </button>
      </div>

      {/* 내 포스트 */}
      <div className="mt-2 space-y-2 p-2">
        {posts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">아직 작성한 게시물이 없습니다.</div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
