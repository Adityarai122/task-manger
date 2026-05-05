import jwt, { type JwtPayload as StandardJwtPayload, type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '@/config/env';

export interface AccessTokenPayload {
  sub: string;          // user id
  email: string;
  name: string;
  roles: string[];      // ['Admin'] or ['User']
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  jti: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    algorithm: 'HS256',
  } as SignOptions);

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL,
    algorithm: 'HS256',
  } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload & StandardJwtPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & StandardJwtPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload & StandardJwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & StandardJwtPayload;

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = Number(match[1]);
  const unit = match[2];
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return value * map[unit as keyof typeof map];
};
