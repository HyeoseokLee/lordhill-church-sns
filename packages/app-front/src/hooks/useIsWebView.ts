export function useIsWebView(): boolean {
  const userAgent = navigator.userAgent || '';
  return /capacitor/i.test(userAgent) || /wv/i.test(userAgent);
}
