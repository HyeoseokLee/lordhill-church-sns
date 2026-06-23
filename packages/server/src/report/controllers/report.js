import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// 유효한 신고 대상 타입
const validTargetTypes = ['post', 'comment', 'recycle', 'recycle_comment'];

// 신고 대상이 존재하는지 확인
const findTarget = async (targetType, targetId) => {
  const modelMap = {
    post: models.Post,
    comment: models.Comment,
    recycle: models.Recycle,
    recycle_comment: models.RecycleComment,
  };
  const Model = modelMap[targetType];
  if (!Model) return null;
  return Model.findByPk(targetId);
};

// 신고 생성
export const createReport = async (req, res) => {
  const { targetType, targetId, reason, detail } = req.body;
  const userId = req.user.id;

  if (!validTargetTypes.includes(targetType)) {
    throw new ErrClass(ErrInfo.BadRequest, '유효하지 않은 신고 대상입니다.');
  }

  if (!['spam', 'abuse', 'inappropriate', 'other'].includes(reason)) {
    throw new ErrClass(ErrInfo.BadRequest, '유효하지 않은 신고 사유입니다.');
  }

  if (reason === 'other' && (!detail || !detail.trim())) {
    throw new ErrClass(ErrInfo.BadRequest, '기타 사유를 입력해주세요.');
  }

  // 신고 대상 존재 확인
  const target = await findTarget(targetType, targetId);
  if (!target) {
    throw new ErrClass(ErrInfo.NotFound, '신고 대상을 찾을 수 없습니다.');
  }

  // 자기 자신의 콘텐츠는 신고 불가
  if (target.userId === userId) {
    throw new ErrClass(
      ErrInfo.BadRequest,
      '자신의 콘텐츠는 신고할 수 없습니다.',
    );
  }

  // 중복 신고 방지 (기각된 신고는 재신고 허용)
  const existing = await models.Report.findOne({
    where: { userId, targetType, targetId },
  });
  if (existing) {
    if (existing.status === 'pending') {
      throw new ErrClass(ErrInfo.DuplicateReport);
    }
    // 기각된 신고 → 기존 레코드 업데이트로 재신고
    await existing.update({
      reason,
      detail: detail?.trim() || null,
      status: 'pending',
    });
  } else {
    await models.Report.create({
      userId,
      targetType,
      targetId,
      reason,
      detail: detail?.trim() || null,
    });
  }

  res.json({ message: '신고가 접수되었습니다.' });
};

// 내 신고 내역 조회 (특정 대상 타입 + ID 목록)
export const getMyReports = async (req, res) => {
  const { targetType, targetIds } = req.query;
  const userId = req.user.id;

  if (!targetType || !targetIds) {
    return res.json([]);
  }

  const ids = targetIds
    .split(',')
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  if (ids.length === 0) {
    return res.json([]);
  }

  const reports = await models.Report.findAll({
    attributes: ['targetType', 'targetId'],
    where: { userId, targetType, targetId: ids, status: 'pending' },
    raw: true,
  });

  res.json(
    reports.map((r) => ({ targetType: r.targetType, targetId: r.targetId })),
  );
};
