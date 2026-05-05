import type { RequestHandler } from 'express';
import { UnauthorizedError } from '@/core/errors/AppError';
import { verifyAccessToken, type AccessTokenPayload } from '@/core/utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AccessTokenPayload;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = header.slice(7).trim();
  if (!token) throw new UnauthorizedError('Empty access token');

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'TokenExpiredError'
        ? 'Access token expired'
        : 'Invalid access token';
    throw new UnauthorizedError(message);
  }
};
