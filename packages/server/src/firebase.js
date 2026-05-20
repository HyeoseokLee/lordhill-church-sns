// Firebase Admin SDK 초기화 (푸시 알림 전송용)
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(
  __dirname,
  '../firebase-service-account.json',
);

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('firebase-admin-initialized');
} catch (err) {
  logger.warn('firebase-admin-init-failed', {
    message: err.message,
    hint: 'firebase-service-account.json 파일이 packages/server/ 에 있는지 확인',
  });
}

export default admin;
