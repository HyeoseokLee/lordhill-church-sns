import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { sendPushToUser } from '../../push/pushService.js';
import logger from '../../logger.js';

// 어드민에서 푸시 전송 (단일 유저 또는 전체)
export const sendPush = async (req, res) => {
  const { userId, title, body } = req.body;
  const senderId = req.user.id;

  if (!title || !body) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  let pushLog;
  let result;

  try {
    // 단일 유저 또는 전체 대상 결정
    if (userId) {
      // 단일 유저 대상
      pushLog = await models.PushLog.create({
        senderId,
        targetType: 'user',
        targetUserId: userId,
        title,
        body,
        status: 'pending',
      });

      result = await sendPushToUser(userId, { title, body });
    } else {
      // 전체 approved 유저 대상
      pushLog = await models.PushLog.create({
        senderId,
        targetType: 'all',
        targetUserId: null,
        title,
        body,
        status: 'pending',
      });

      // 전체 approved 유저에게 푸시 전송
      const approvedUsers = await models.User.findAll({
        where: { status: 'approved' },
        attributes: ['id'],
      });

      const userIds = approvedUsers.map((u) => u.id);
      result = { success: 0, failure: 0 };

      for (const uid of userIds) {
        const userResult = await sendPushToUser(uid, { title, body });
        result.success += userResult.success;
        result.failure += userResult.failure;
      }
    }

    // 푸시 로그 업데이트
    await pushLog.update({
      sentAt: new Date(),
      successCount: result.success,
      failureCount: result.failure,
      status: result.success > 0 ? 'sent' : 'failed',
    });

    res.json({
      message: 'ok',
      success: result.success,
      failure: result.failure,
    });
  } catch (err) {
    // 푸시 로그 상태 업데이트 (실패)
    if (pushLog) {
      await pushLog.update({
        status: 'failed',
      });
    }
    logger.error('push-send-failed', { error: err.message });
    throw err;
  }
};

// 푸시 이력 조회 (최신순 페이지네이션)
export const getPushLogs = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const { count, rows } = await models.PushLog.findAndCountAll({
    include: [
      {
        model: models.User,
        as: 'sender',
        attributes: ['id', 'nickname'],
      },
      {
        model: models.User,
        as: 'targetUser',
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
