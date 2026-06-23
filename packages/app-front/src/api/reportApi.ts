import axiosInstance from './axiosInstance';

// 신고 대상 타입
export type ReportTargetType =
  | 'post'
  | 'comment'
  | 'recycle'
  | 'recycle_comment';

// 신고 사유
export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'other';

export const reportApi = {
  // 신고 생성
  create: (data: {
    targetType: ReportTargetType;
    targetId: number;
    reason: ReportReason;
    detail?: string;
  }) => axiosInstance.post('/reports', data),

  // 내 신고 내역 조회
  getMine: (targetType: ReportTargetType, targetIds: number[]) =>
    axiosInstance.get<{ targetType: string; targetId: number }[]>(
      `/reports/mine?targetType=${targetType}&targetIds=${targetIds.join(',')}`,
    ),
};
