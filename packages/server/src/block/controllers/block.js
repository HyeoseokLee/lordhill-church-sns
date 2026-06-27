import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// 사용자 차단
export const blockUser = async (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.userId, 10);

  if (blockerId === blockedId) {
    throw new ErrClass(ErrInfo.BadRequest, '자기 자신은 차단할 수 없습니다.');
  }

  const targetUser = await models.User.findByPk(blockedId);
  if (!targetUser) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }

  await models.UserBlock.findOrCreate({
    where: { blockerId, blockedId },
  });

  res.json({ message: '사용자를 차단했습니다.' });
};

// 사용자 차단 해제
export const unblockUser = async (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.userId, 10);

  await models.UserBlock.destroy({
    where: { blockerId, blockedId },
  });

  res.json({ message: '차단이 해제되었습니다.' });
};

// 내가 차단한 유저 목록
export const getBlockedUsers = async (req, res) => {
  const blocks = await models.UserBlock.findAll({
    where: { blockerId: req.user.id },
    include: [
      {
        model: models.User,
        as: 'blocked',
        attributes: ['id', 'nickname', 'profileImageUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json(blocks.map((b) => b.blocked));
};

// 내가 차단한 유저 ID 목록 (피드 필터링용)
export const getBlockedIds = async (req, res) => {
  const blocks = await models.UserBlock.findAll({
    where: { blockerId: req.user.id },
    attributes: ['blockedId'],
    raw: true,
  });

  res.json(blocks.map((b) => b.blockedId));
};
