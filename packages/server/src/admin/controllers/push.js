import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { sendPushToUser, sendPushToAll } from '../../push/pushService.js';
import logger from '../../logger.js';

// 어드민에서 푸시 전송 (단일 유저 또는 전체)
export const sendPush = async (req, res) => {
  const { userId, title, body, path } = req.body;

  if (!title || !body) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  try {
    const data = path ? { path } : {};
    let result;

    if (userId) {
      // 단일 유저 대상
      result = await sendPushToUser(userId, {
        title,
        body,
        data,
        senderType: 'admin',
      });
    } else {
      // 전체 approved 유저 대상
      result = await sendPushToAll({
        title,
        body,
        data,
        senderType: 'admin',
      });
    }

    res.json({
      message: 'ok',
      success: result.success,
      failure: result.failure,
    });
  } catch (err) {
    logger.error('admin-push-send-failed', { error: err.message });
    throw err;
  }
};

// 푸시 이력 조회 (pushs 테이블, 어드민 발송분)
export const getPushLogs = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const { count, rows } = await models.Push.findAndCountAll({
    where: { senderType: 'admin' },
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'nickname'],
      },
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: Number(limit),
  });

  res.json({
    data: rows,
    pagination: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(count / limit),
    },
  });
};
