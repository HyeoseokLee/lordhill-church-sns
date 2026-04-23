import { create } from 'zustand';

interface UIState {
  isBottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBottomNavVisible: true,
  setBottomNavVisible: (isBottomNavVisible) => set({ isBottomNavVisible }),
}));
