import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { contentLimit } from '../../define.js';

export const getProfile = async (req, res) => {
  const user = await models.User.findByPk(req.user.id, {
    attributes: [
      'id',
      'email',
      'nickname',
      'profileImageUrl',
      'provider',
      'role',
      'status',
      'tosAcceptedAt',
      'createdAt',
    ],
  });
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }
  res.json(user);
};

export const updateProfile = async (req, res) => {
  const { nickname } = req.body;
  const userId = req.user.id;

  if (nickname) {
    if (
      nickname.length < contentLimit.nicknameMinLength ||
      nickname.length > contentLimit.nicknameMaxLength
    ) {
      throw new ErrClass(ErrInfo.InvalidNickname);
    }

    const existing = await models.User.findOne({
      where: { nickname },
    });
    if (existing && existing.id !== userId) {
      throw new ErrClass(ErrInfo.DuplicateNickname);
    }
  }

  const updateData = {};
  if (nickname) updateData.nickname = nickname;
  if (req.file) updateData.profileImageUrl = req.file.location || req.file.path;

  await models.User.update(updateData, { where: { id: userId } });

  const user = await models.User.findByPk(userId, {
    attributes: [
      'id',
      'email',
      'nickname',
      'profileImageUrl',
      'provider',
      'role',
      'status',
      'tosAcceptedAt',
      'createdAt',
    ],
  });
  res.json(user);
};

// 이용약관 동의 처리
export const acceptTerms = async (req, res) => {
  const userId = req.user.id;

  await models.User.update(
    { tosAcceptedAt: new Date() },
    { where: { id: userId } },
  );

  const user = await models.User.findByPk(userId, {
    attributes: [
      'id',
      'email',
      'nickname',
      'profileImageUrl',
      'provider',
      'role',
      'status',
      'tosAcceptedAt',
      'createdAt',
    ],
  });
  res.json(user);
};

// 회원 탈퇴 (소프트 딜리트)
export const deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const user = await models.User.findByPk(userId);
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }

  // 게시글/댓글 소프트 딜리트
  await models.Post.destroy({ where: { userId } });
  await models.Comment.destroy({ where: { userId } });
  await models.Recycle.destroy({ where: { userId } });
  await models.RecycleComment.destroy({ where: { userId } });

  // 유저 소프트 딜리트 (paranoid: true)
  await user.destroy();

  // FCM 토큰 삭제
  await models.FcmToken.destroy({ where: { userId } });

  // 쿠키 클리어
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  res.json({ message: '회원 탈퇴가 완료되었습니다.' });
};

export const getUserProfile = async (req, res) => {
  const user = await models.User.findByPk(req.params.id, {
    attributes: ['id', 'nickname', 'profileImageUrl', 'createdAt'],
  });
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }
  res.json(user);
};
