import admin from '../firebase.js';
import models from '../db.js';
import logger from '../logger.js';

// 특정 유저에게 푸시 전송
export const sendPushToUser = async (userId, { title, body, data }) => {
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

// 여러 토큰에 푸시 전송
export const sendPushToTokens = async (tokens, { title, body, data }) => {
  if (tokens.length === 0) return { success: 0, failure: 0 };

  // FCM 메시지: 공통 notification/data + 플랫폼별 apns/android 설정
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
