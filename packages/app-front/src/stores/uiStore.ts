import { create } from 'zustand';

interface UIState {
  isBottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
  // 글쓰기 드로어 상태
  isWriteDrawerOpen: boolean;
  setWriteDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomNavVisible: true,
  setBottomNavVisible: (isBottomNavVisible) => set({ isBottomNavVisible }),
  isWriteDrawerOpen: false,
  setWriteDrawerOpen: (isWriteDrawerOpen) => set({ isWriteDrawerOpen }),
}));
