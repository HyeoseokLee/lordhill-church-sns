import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '@/components/frame/MainLayout';
import LoginPage from '@/pages/login/LoginPage';
import FeedPage from '@/pages/feed/FeedPage';
import PostDetailPage from '@/pages/post/PostDetailPage';
import CreatePostPage from '@/pages/post/CreatePostPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import PendingPage from '@/pages/login/PendingPage';
import NotFoundPage from '@/pages/error/NotFoundPage';
import OAuthCallbackPage from '@/pages/login/OAuthCallbackPage';

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
      {
        index: true,
        element: <FeedPage />,
      },
      {
        path: 'posts/:postId',
        element: <PostDetailPage />,
      },
      {
        path: 'posts/new',
        element: <CreatePostPage />,
      },
      {
        path: 'profile/:userId',
        element: <ProfilePage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
