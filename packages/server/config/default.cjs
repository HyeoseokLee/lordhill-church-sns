module.exports = {
  bind: {
    address: '0.0.0.0',
    port: parseInt(process.env.PORT, 10) || 3001,
  },

  sequelize: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3307',
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    database: process.env.DB_DATABASE || 'lordhill_sns',
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4_general_ci',
    },
    logging: false,
  },

  JWT: {
    EXPIRE_TIME: '1h',
    EXPIRE_REFRESH_TIME: '30d',
    JWT_SECRET:
      process.env.JWT_SECRET || 'lordhill-jwt-secret-change-me-in-production',
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ||
      'lordhill-jwt-refresh-secret-change-me-in-production',
  },

  cors: {
    origins: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      process.env.ADMIN_URL || 'http://localhost:5174',
    ],
  },

  log: {
    console: {
      level: 'info',
    },
    file: {
      level: 'verbose',
      prefix: 'lordhill-',
    },
  },

  uploader: {
    useS3: true,
    s3: {
      region: process.env.AWS_REGION || 'ap-northeast-2',
      endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:4566',
      forcePathStyle: true,
      bucketName: process.env.AWS_S3_BUCKET || 'lordhill-media',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      presignedUrl: {
        expires: 10 * 60, // 10분
        video: {
          expires: 60 * 60, // 1시간
          maxFileSize: 100 * 1024 * 1024, // 100MB
        },
      },
    },
    image: {
      maxWidth: 1920,
      quality: 80,
      maxCount: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
  },

  rateLimit: {
    auth: { windowMs: 15 * 60 * 1000, max: 10 },
    upload: { windowMs: 60 * 1000, max: 5 },
    post: { windowMs: 60 * 1000, max: 10 },
    comment: { windowMs: 60 * 1000, max: 30 },
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/api/auth/google/callback',
    },
    kakao: {
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      callbackUrl:
        process.env.KAKAO_CALLBACK_URL ||
        'http://localhost:3001/api/auth/kakao/callback',
    },
    naver: {
      clientId: process.env.NAVER_CLIENT_ID || '',
      clientSecret: process.env.NAVER_CLIENT_SECRET || '',
      callbackUrl:
        process.env.NAVER_CALLBACK_URL ||
        'http://localhost:3001/api/auth/naver/callback',
    },
  },
};
