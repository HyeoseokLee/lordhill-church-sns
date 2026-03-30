import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';

export default function FeedPage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPosts = useCallback(async (cursor = null) => {
    const isMore = !!cursor;
    isMore ? setLoadingMore(true) : setLoading(true);

    try {
      const params = cursor ? { cursor } : {};
      const { data } = await api.get('/posts', { params });
      setPosts((prev) => (isMore ? [...prev, ...data.posts] : data.posts));
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      isMore ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
      nextCursor &&
      !loadingMore
    ) {
      fetchPosts(nextCursor);
    }
  }, [nextCursor, loadingMore, fetchPosts]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handlePostCreated = () => {
    setShowCreate(false);
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
        <h1 className="text-lg font-bold">로드힐 교회</h1>
        <Link to="/profile" className="text-gray-500">
          {user?.nickname || '프로필'}
        </Link>
      </div>

      {/* 포스트 목록 */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">📝</p>
          <p>아직 게시물이 없습니다.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            첫 번째 글을 작성해보세요!
          </button>
        </div>
      ) : (
        <div className="space-y-2 p-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="text-center py-4 text-gray-400">불러오는 중...</div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 transition z-20"
      >
        +
      </button>

      {/* 포스트 작성 모달 */}
      {showCreate && (
        <CreatePost onClose={() => setShowCreate(false)} onCreated={handlePostCreated} />
      )}
    </div>
  );
}
