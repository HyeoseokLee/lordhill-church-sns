import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import 'winston-daily-rotate-file';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

const consoleLogger = winston.createLogger({
  level: config.log.console.level,
  levels,
  transports: [
    new winston.transports.Console({
      json: false,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf((info) => {
          return `${info.timestamp} - ${info.level}: ${info.message} ${
            info.params !== undefined ? JSON.stringify(info.params) : ''
          }`;
        }),
      ),
    }),
  ],
  exitOnError: false,
});

const fileLogger = winston.createLogger({
  level: config.log.file.level,
  levels,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: `logs/${config.log.file.prefix}%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: false,
      json: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      colorize: false,
    }),
  ],
  exitOnError: false,
});

const logger = {
  log: (logLevel, message, params) => {
    consoleLogger.log(logLevel, { message, params });
    fileLogger.log(logLevel, { message, params });
  },
  error: (message, params) => {
    consoleLogger.error({ message, params });
    fileLogger.error({ message, params });
  },
  warn: (message, params) => {
    consoleLogger.warn({ message, params });
    fileLogger.warn({ message, params });
  },
  info: (message, params) => {
    consoleLogger.info({ message, params });
    fileLogger.info({ message, params });
  },
  verbose: (message, params) => {
    consoleLogger.verbose({ message, params });
    fileLogger.verbose({ message, params });
  },
  debug: (message, params) => {
    consoleLogger.debug({ message, params });
    fileLogger.debug({ message, params });
  },
};

export const middleware = () => (req, res, next) => {
  if (req.url === '/health') {
    next();
    return;
  }

  const requestId = uuidv4();

  logger.info('http-request-begin', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    remoteAddr: req.ip,
  });

  const startTime = process.hrtime();

  res.on('finish', () => {
    const timeElapsed = process.hrtime(startTime);
    const responseTime = timeElapsed[0] * 1000 + timeElapsed[1] / 1e6;

    let user;
    if (req.user) {
      user = {
        id: req.user.id,
        nickname: req.user.nickname,
        role: req.user.role,
      };
    }

    logger.info('http-request', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime,
      remoteAddr: req.ip,
      user,
      memory: process.memoryUsage(),
    });
  });

  next();
};

export default logger;
