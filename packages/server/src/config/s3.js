const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  ...(process.env.AWS_S3_ENDPOINT && {
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
  }),
});

module.exports = s3;
