// API 서버 베이스 URL (로컬: Vite 프록시, 라이브: VITE_API_URL → HTTPS)
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// User roles
export const USER_ROLE = {
  PENDING: 'PENDING',
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const;

// OAuth providers
export const OAUTH_PROVIDER = {
  GOOGLE: 'google',
  KAKAO: 'kakao',
  NAVER: 'naver',
} as const;

// Post pagination
export const FEED_PAGE_SIZE = 20;

// Comment pagination
export const COMMENT_PAGE_SIZE = 20;

// 콘텐츠 제한 (서버 define.js와 동일)
export const contentLimit = {
  postMaxLength: 2000,
  commentMaxLength: 500,
  imageMaxCount: 10,
} as const;

// Image upload limits
export const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const IMAGE_MAX_COUNT = 10;

// Video upload limits
export const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB

// Default URL path after login
export const DEFAULT_URL_PATH = '/';

// API response codes
export const TOKEN_EXPIRED_CODE = 401;
