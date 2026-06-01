import admin from '../firebase.js';
import models from '../db.js';
import logger from '../logger.js';
import { userStatus } from '../define.js';

// 특정 유저에게 푸시 전송 + pushs 테이블 저장
export const sendPushToUser = async (
  userId,
  { title, body, data, senderType = 'system' },
) => {
  // pushs 테이블에 알림 저장
  await models.Push.create({
    userId,
    senderType,
    title,
    body,
    path: data?.path || null,
  });

  const tokens = await models.FcmToken.findAll({
    where: { userId },
    attributes: ['token'],
  });

  if (tokens.length === 0) {
    logger.warn('push-no-tokens', { userId });
    return { success: 0, failure: 0 };
  }

  const tokenStrings = tokens.map((t) => t.token);
  return sendPushToTokens(tokenStrings, { title, body, data });
};

// 전체 유저에게 푸시 전송 + pushs 테이블 저장 (excludeUserId 제외)
export const sendPushToAll = async (
  { title, body, data, senderType = 'system' },
  excludeUserId = null,
) => {
  // 승인된 전체 유저 조회
  const where = { status: userStatus.approved };
  if (excludeUserId) {
    where.id = { [models.Sequelize.Op.ne]: excludeUserId };
  }
  const users = await models.User.findAll({
    where,
    attributes: ['id'],
  });

  if (users.length === 0) return { success: 0, failure: 0 };

  // pushs 테이블에 유저별 알림 저장
  const pushRecords = users.map((u) => ({
    userId: u.id,
    senderType,
    title,
    body,
    path: data?.path || null,
  }));
  await models.Push.bulkCreate(pushRecords);

  // FCM 토큰 조회
  const userIds = users.map((u) => u.id);
  const tokens = await models.FcmToken.findAll({
    where: { userId: userIds },
    attributes: ['token'],
  });

  if (tokens.length === 0) return { success: 0, failure: 0 };

  return sendPushToTokens(
    tokens.map((t) => t.token),
    { title, body, data },
  );
};

// 여러 토큰에 푸시 전송 (FCM 발송만, DB 저장 안 함)
export const sendPushToTokens = async (tokens, { title, body, data }) => {
  if (tokens.length === 0) return { success: 0, failure: 0 };

  const message = {
    notification: { title, body },
    data: data || {},
    tokens,
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    android: {
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info('push-sent', {
      success: response.successCount,
      failure: response.failureCount,
    });

    // 만료/무효 토큰 정리
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await models.FcmToken.destroy({
          where: { token: invalidTokens },
        });
        logger.info('push-invalid-tokens-removed', {
          count: invalidTokens.length,
        });
      }
    }

    return {
      success: response.successCount,
      failure: response.failureCount,
    };
  } catch (err) {
    logger.error('push-send-failed', { error: err.message });
    throw err;
  }
};
