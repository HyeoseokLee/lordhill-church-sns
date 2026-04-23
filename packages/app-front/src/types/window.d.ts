// Capacitor bridge types (for future mobile wrapper)
interface CapacitorBridge {
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  removeToken: () => Promise<void>;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => 'web' | 'ios' | 'android';
    };
    capacitorBridge?: CapacitorBridge;
  }
}

export {};
