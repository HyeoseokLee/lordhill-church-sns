import models from '../../db.js';

// 내 알림 목록 (최신순, 페이지네이션)
export const getMyPushs = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageSize = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * pageSize;

  const { rows, count } = await models.Push.findAndCountAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  res.json({
    items: rows,
    total: count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / pageSize),
  });
};

// 안 읽은 알림 개수
export const getUnreadCount = async (req, res) => {
  const count = await models.Push.count({
    where: { userId: req.user.id, isRead: false },
  });

  res.json({ count });
};

// 알림 읽음 처리
export const markAsRead = async (req, res) => {
  await models.Push.update(
    { isRead: true },
    { where: { id: req.params.id, userId: req.user.id } },
  );

  res.json({ message: 'ok' });
};

// 전체 읽음 처리
export const markAllAsRead = async (req, res) => {
  await models.Push.update(
    { isRead: true },
    { where: { userId: req.user.id, isRead: false } },
  );

  res.json({ message: 'ok' });
};
