import { Toaster } from 'react-hot-toast';
import ThemeProvider from '@/components/frame/ThemeProvider';
import Router from '@/router/Router';
import { useAuth } from '@/hooks/useAuth';

export default function App() {
  useAuth();

  return (
    <ThemeProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '14px',
          },
        }}
      />
      <Router />
    </ThemeProvider>
  );
}
