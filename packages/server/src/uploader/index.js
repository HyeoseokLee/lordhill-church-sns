import path from 'node:path';
import config from 'config';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Config = config.uploader.s3;

const s3Client = new S3Client({
  region: s3Config.region,
  endpoint: s3Config.endpoint,
  forcePathStyle: s3Config.forcePathStyle,
  credentials: s3Config.credentials,
});

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const videoExtensions = ['.mp4', '.mov'];

const fileFilter = (allowedExtensions) => (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`허용되지 않는 파일 확장자입니다: ${ext}`), false);
  }
};

const s3Storage = (folder) =>
  multerS3({
    s3: s3Client,
    bucket: s3Config.bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${folder}/${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });

export const uploadImage = multer({
  storage: s3Storage('images'),
  fileFilter: fileFilter(imageExtensions),
  limits: {
    fileSize: config.uploader.image.maxFileSize,
    files: config.uploader.image.maxCount,
  },
});

export const uploadVideo = multer({
  storage: s3Storage('videos'),
  fileFilter: fileFilter(videoExtensions),
  limits: {
    fileSize: config.uploader.s3.presignedUrl.video.maxFileSize,
    files: 1,
  },
});

export const uploadProfileImage = multer({
  storage: s3Storage('profiles'),
  fileFilter: fileFilter(imageExtensions),
  limits: {
    fileSize: config.uploader.image.maxFileSize,
    files: 1,
  },
});

export { s3Client };
