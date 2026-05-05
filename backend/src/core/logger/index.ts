import pino from 'pino';
import { env } from '@/config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  redact: {
    paths: ['req.headers.authorization', 'password', '*.password', '*.passwordHash', 'token', '*.token'],
    censor: '[REDACTED]',
  },
});
