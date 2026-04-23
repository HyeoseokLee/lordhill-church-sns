import multer from 'multer';
import logger from './logger.js';

export const ErrInfo = {
  Internal: { statusCode: 500, code: 1, message: 'internal error' },
  NotFound: { statusCode: 404, code: 2, message: 'not found' },
  UnAuthorized: {
    statusCode: 401,
    code: 3,
    message: 'unauthorized',
    logLevel: 'warn',
  },
  BadRequest: { statusCode: 400, code: 4, message: 'bad request' },
  Forbidden: { statusCode: 403, code: 5, message: '접근이 거부되었습니다.' },

  // Auth
  TokenExpired: {
    statusCode: 498,
    code: 10,
    message: '토큰이 만료되었습니다.',
  },
  InvalidRefreshToken: {
    statusCode: 400,
    code: 11,
    message: '유효하지 않은 리프레시 토큰입니다.',
  },

  // User
  NotFoundUser: {
    statusCode: 400,
    code: 20,
    message: '해당 사용자를 찾을 수 없습니다.',
  },
  UserPending: {
    statusCode: 403,
    code: 21,
    message: '관리자 승인을 기다리는 중입니다.',
  },
  UserRejected: {
    statusCode: 403,
    code: 22,
    message: '가입이 거절되었습니다. 관리자에게 문의해주세요.',
  },
  UserDeactivated: {
    statusCode: 403,
    code: 23,
    message: '비활성화된 계정입니다.',
  },
  DuplicateNickname: {
    statusCode: 400,
    code: 24,
    message: '이미 사용중인 닉네임입니다.',
  },
  InvalidNickname: {
    statusCode: 400,
    code: 25,
    message: '닉네임은 2~20자, 한글/영문/숫자/밑줄만 가능합니다.',
  },

  // Post
  NotFoundPost: {
    statusCode: 404,
    code: 30,
    message: '해당 게시글을 찾을 수 없습니다.',
  },
  PostContentTooLong: {
    statusCode: 400,
    code: 31,
    message: '게시글은 최대 2000자까지 가능합니다.',
  },

  // Comment
  NotFoundComment: {
    statusCode: 404,
    code: 40,
    message: '해당 댓글을 찾을 수 없습니다.',
  },
  CommentContentTooLong: {
    statusCode: 400,
    code: 41,
    message: '댓글은 최대 500자까지 가능합니다.',
  },

  // File
  FileTooLarge: {
    statusCode: 400,
    code: 50,
    message: '파일의 크기가 너무 큽니다.',
  },
  LimitFileCount: {
    statusCode: 400,
    code: 51,
    message: '파일의 개수가 너무 많습니다.',
  },
  FileExtNotAllowed: {
    statusCode: 400,
    code: 52,
    message: '허용되지 않는 파일 확장자입니다.',
  },

  // Duplicate
  DuplicatedValue: {
    statusCode: 400,
    code: 60,
    message: '중복된 값이 존재합니다.',
  },
};

class CustomError extends Error {
  constructor(errInfo, customMessage) {
    super(errInfo.message);
    this.statusCode = errInfo.statusCode;
    this.message = customMessage || errInfo.message;
    this.code = errInfo.code;
    this.logLevel = errInfo.logLevel;
    this.params = errInfo.params;
  }
}

export const errHandler = (err, _req, res, _next) => {
  let resErr;

  res.set('Cache-Control', 'no-store');

  if (err instanceof CustomError) {
    resErr = err;
    logger.log(err.logLevel || 'warn', 'api-error', err.stack);
  } else if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      resErr = new CustomError(ErrInfo.FileTooLarge);
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      resErr = new CustomError(ErrInfo.LimitFileCount);
    } else {
      resErr = new CustomError(ErrInfo.Internal);
      logger.error('unhandled-multer-exception', err.stack);
    }
  } else if (err.parent && err.parent.code === 'ER_DUP_ENTRY') {
    resErr = new CustomError(ErrInfo.DuplicatedValue);
  } else {
    logger.error('unhandled-exception', {
      err: err.message,
      stack: err.stack,
    });
    resErr = new CustomError({
      statusCode: 500,
      code: 1,
      message: err.toString(),
    });
  }

  res.status(resErr.statusCode).send({
    message: resErr.message,
    code: resErr.code,
    params: resErr.params,
  });
};

export const ErrClass = CustomError;
