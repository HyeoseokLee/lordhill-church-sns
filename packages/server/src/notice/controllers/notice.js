import models from '../../db.js';

// 공지사항 목록 조회 (앱용, 활성 공지만)
export const getNotices = async (_req, res) => {
  const notices = await models.Notice.findAll({
    attributes: ['id', 'title', 'content', 'displayOrder', 'createdAt'],
    order: [
      ['displayOrder', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });
  res.json(notices);
};
