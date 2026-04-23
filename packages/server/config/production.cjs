module.exports = {
  log: {
    console: {
      level: 'warn',
    },
    file: {
      level: 'info',
    },
  },

  uploader: {
    s3: {
      endpoint: undefined, // 프로덕션에서는 실제 AWS S3 사용
      forcePathStyle: false,
    },
  },
};
