const multer = require('multer');
const multerS3 = require('multer-s3');
const sharp = require('sharp');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const s3 = require('../config/s3');
const path = require('path');
const crypto = require('crypto');

const BUCKET = process.env.AWS_S3_BUCKET || 'lordhill-media';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function generateKey(prefix, originalname) {
  const ext = path.extname(originalname);
  const hash = crypto.randomBytes(16).toString('hex');
  return `${prefix}/${new Date().toISOString().slice(0, 10)}/${hash}${ext}`;
}

// 이미지 리사이즈 후 S3 업로드 (Sharp)
async function resizeAndUpload(buffer, key) {
  const resized = await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key.replace(/\.[^.]+$/, '.jpg'),
      Body: resized,
      ContentType: 'image/jpeg',
    })
  );

  const endpoint = process.env.AWS_S3_ENDPOINT;
  const finalKey = key.replace(/\.[^.]+$/, '.jpg');
  if (endpoint) {
    return `${endpoint}/${BUCKET}/${finalKey}`;
  }
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalKey}`;
}

// 이미지 업로드 (메모리에 받아서 Sharp로 리사이즈)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF)'));
    }
  },
});

// 프로필 이미지 업로드
const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 이미지 형식입니다.'));
    }
  },
});

module.exports = {
  imageUpload,
  profileImageUpload,
  resizeAndUpload,
  generateKey,
  BUCKET,
};
