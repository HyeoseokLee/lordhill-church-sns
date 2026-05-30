import { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import MainLayout from '@/components/frame/MainLayout';
import LoginPage from '@/pages/login/LoginPage';
import PendingPage from '@/pages/login/PendingPage';
import OAuthCallbackPage from '@/pages/login/OAuthCallbackPage';
import NotFoundPage from '@/pages/error/NotFoundPage';
// 메인 탭 WithOutlet 래퍼
import FeedWithOutlet from '@/pages/feed/FeedWithOutlet';
import RecycleWithOutlet from '@/pages/recycle/RecycleWithOutlet';
import PrayerWithOutlet from '@/pages/prayer/PrayerWithOutlet';
import MyWithOutlet from '@/pages/my/MyWithOutlet';
// 자식 페이지
import PostDetailPage from '@/pages/feed/detail/index';
import FeedWritePage from '@/pages/feed/post/index';
import RecyclePostPage from '@/pages/recycle/post/index';
import RecycleDetailPage from '@/pages/recycle/detail/index';
import PrayerWritePage from '@/pages/prayer/write/index';
import ProfilePage from '@/pages/my/profile/index';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/pending',
    element: <PendingPage />,
  },
  {
    path: '/auth/callback',
    element: <OAuthCallbackPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // 루트 → 피드로 리다이렉트
      {
        index: true,
        element: <Navigate to="/feed" replace />,
      },
      // 피드 탭 (홈)
      {
        path: 'feed',
        element: <FeedWithOutlet />,
        children: [
          { path: 'post', element: <FeedWritePage /> },
          { path: 'detail/:postId', element: <PostDetailPage /> },
        ],
      },
      // 돌고래(재활용) 탭
      {
        path: 'recycle',
        element: <RecycleWithOutlet />,
        children: [
          { path: 'post', element: <RecyclePostPage /> },
          { path: 'detail/:recycleId', element: <RecycleDetailPage /> },
        ],
      },
      // 기도 탭
      {
        path: 'prayer',
        element: <PrayerWithOutlet />,
        children: [{ path: 'write', element: <PrayerWritePage /> }],
      },
      // 마이페이지 탭
      {
        path: 'my',
        element: <MyWithOutlet />,
        children: [{ path: 'profile', element: <ProfilePage /> }],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default function Router() {
  // 네이티브 브릿지에서 호출할 navigate 함수를 window에 등록
  useEffect(() => {
    window.__navigateTo = (path: string) => {
      router.navigate(path);
    };
    return () => {
      delete window.__navigateTo;
    };
  }, []);

  return <RouterProvider router={router} />;
}
