import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// FCM 토큰 등록/갱신 — 앱 실행 시 네이티브에서 호출
export const registerFcmToken = async (req, res) => {
  const { token, platform } = req.body;

  if (!token || !platform) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  if (!['ios', 'android'].includes(platform)) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  // 같은 토큰이 다른 유저에게 있으면 삭제 (기기 변경 대응)
  await models.FcmToken.destroy({ where: { token } });

  // 현재 유저에게 토큰 등록
  await models.FcmToken.create({
    userId: req.user.id,
    token,
    platform,
  });

  res.json({ message: 'ok' });
};

// FCM 토큰 삭제 — 로그아웃 시 호출
export const deleteFcmToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  await models.FcmToken.destroy({
    where: { userId: req.user.id, token },
  });

  res.json({ message: 'ok' });
};
