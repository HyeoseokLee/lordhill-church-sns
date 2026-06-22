import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage: string | null;
  role: string;
  status: string;
  provider: string;
  tosAcceptedAt: string | null;
}

// 서버 응답 필드명을 프론트 필드명으로 매핑
const mapUser = (data: any): User => ({
  id: data.id,
  email: data.email || '',
  name: data.nickname || data.name || '',
  profileImage: data.profileImageUrl || data.profileImage || null,
  role: data.role || '',
  status: data.status || '',
  provider: data.provider || '',
  tosAcceptedAt: data.tosAcceptedAt || null,
});

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: any | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: user =>
    set({
      user: user ? mapUser(user) : null,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: isLoading => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false });
  },
}));
