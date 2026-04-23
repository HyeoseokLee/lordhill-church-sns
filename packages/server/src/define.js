// 사용자 역할
export const userRole = {
  member: 'member',
  admin: 'admin',
};

// 사용자 상태
export const userStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  deactivated: 'deactivated',
};

// OAuth 제공자
export const oauthProvider = {
  google: 'google',
  kakao: 'kakao',
  naver: 'naver',
};

// 미디어 타입
export const mediaType = {
  image: 'image',
  video: 'video',
};

// 페이지네이션 기본값
export const pagination = {
  feedPageSize: 20,
  commentPageSize: 20,
};

// 콘텐츠 제한
export const contentLimit = {
  postMaxLength: 2000,
  commentMaxLength: 500,
  nicknameMinLength: 2,
  nicknameMaxLength: 20,
  imageMaxCount: 10,
  videoMaxCount: 1,
  videoMaxSize: 100 * 1024 * 1024, // 100MB
};

// 관리자 감사 로그 액션
export const auditAction = {
  approveUser: 'approve_user',
  rejectUser: 'reject_user',
  deletePost: 'delete_post',
  deleteComment: 'delete_comment',
};
