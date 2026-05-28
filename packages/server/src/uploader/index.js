import path from 'node:path';
import config from 'config';
import multer from 'multer';
import multerS3 from 'multer-s3';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Config = config.uploader.s3;

// endpoint가 없으면 AWS 기본 엔드포인트 사용 (라이브), 있으면 LocalStack 등 커스텀
const s3ClientConfig = {
  region: s3Config.region,
  credentials: s3Config.credentials,
};
if (s3Config.endpoint) {
  s3ClientConfig.endpoint = s3Config.endpoint;
  s3ClientConfig.forcePathStyle = true;
}
const s3Client = new S3Client(s3ClientConfig);

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

// Presigned URL 발급 (프론트에서 S3에 직접 업로드용)
export const generatePresignedUrl = async (filename, contentType) => {
  const ext = path.extname(filename).toLowerCase();
  const key = `images/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: s3Config.presignedUrl.expires,
  });

  return { presignedUrl, key };
};

// S3에서 여러 파일 삭제 (URL 배열로부터 key 추출)
export const deleteFromS3 = async (urls) => {
  if (!urls || urls.length === 0) return;

  const objects = urls
    .map((url) => {
      // URL에서 key 추출: .../images/uuid.jpg → images/uuid.jpg
      const match = url.match(/\/(images\/.+)$/);
      return match ? { Key: match[1] } : null;
    })
    .filter(Boolean);

  if (objects.length === 0) return;

  const command = new DeleteObjectsCommand({
    Bucket: s3Config.bucketName,
    Delete: { Objects: objects },
  });

  await s3Client.send(command);
};

export { s3Client };
