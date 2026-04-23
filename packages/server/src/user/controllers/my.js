import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { contentLimit } from '../../define.js';

export const getProfile = async (req, res) => {
  const user = await models.User.findByPk(req.user.id, {
    attributes: ['id', 'email', 'nickname', 'profileImageUrl', 'provider', 'role', 'status', 'createdAt'],
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
    attributes: ['id', 'email', 'nickname', 'profileImageUrl', 'provider', 'role', 'status', 'createdAt'],
  });
  res.json(user);
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
