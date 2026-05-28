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
    webkit?: {
      messageHandlers: {
        getToken?: { postMessage: (token: string) => void };
        pickImages?: { postMessage: (maxCount: number) => void };
        jsLog?: { postMessage: (msg: string) => void };
      };
    };
    AndroidBridge?: {
      updateToken?: (token: string) => void;
      pickImages?: (maxCount: number) => void;
    };
    isIOSApp?: boolean;
    __navigateTo?: (path: string) => void;
    // 네이티브에서 이미지 선택 결과를 전달하는 콜백
    __onImagesPicked?: (
      images: Array<{ base64: string; filename: string; contentType: string }>,
    ) => void;
  }
}

export {};
