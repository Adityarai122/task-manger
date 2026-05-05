import { v4 as uuidv4 } from 'uuid';
import { UnauthorizedError } from '@/core/errors/AppError';
import { verifyPassword } from '@/core/utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseDurationToMs,
  type AccessTokenPayload,
} from '@/core/utils/jwt';
import { env } from '@/config/env';
import * as repo from './auth.repository';
import type { LoginDto } from './auth.schema';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
}

export const login = async (
  dto: LoginDto,
  ctx?: { userAgent?: string; ip?: string },
): Promise<AuthResult> => {
  const user = await repo.findUserByEmail(dto.email);
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

  const ok = await verifyPassword(dto.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  const permissions = await repo.resolveUserPermissions(user.id);

  return issueTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((r) => r.role.name),
      permissions,
    },
    user.tokenVersion,
    ctx,
  );
};

export const refresh = async (
  refreshToken: string,
  ctx?: { userAgent?: string; ip?: string },
): Promise<AuthResult> => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const dbToken = await repo.findRefreshTokenByHash(tokenHash);
  if (!dbToken) throw new UnauthorizedError('Refresh token not recognized');
  if (dbToken.revokedAt) throw new UnauthorizedError('Refresh token revoked');
  if (dbToken.expiresAt < new Date()) throw new UnauthorizedError('Refresh token expired');

  const user = await repo.findUserById(payload.sub);
  if (!user || !user.isActive) throw new UnauthorizedError('User no longer active');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new UnauthorizedError('Token version mismatch');
  }

  await repo.revokeRefreshToken(dbToken.id);

  const permissions = await repo.resolveUserPermissions(user.id);

  return issueTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((r) => r.role.name),
      permissions,
    },
    user.tokenVersion,
    ctx,
  );
};

export const logout = async (refreshToken: string): Promise<void> => {
  try {
    const tokenHash = hashToken(refreshToken);
    const dbToken = await repo.findRefreshTokenByHash(tokenHash);
    if (dbToken && !dbToken.revokedAt) {
      await repo.revokeRefreshToken(dbToken.id);
    }
  } catch {
    // Idempotent on bad input.
  }
};

const issueTokens = async (
  user: AuthResult['user'],
  tokenVersion: number,
  ctx?: { userAgent?: string; ip?: string },
): Promise<AuthResult> => {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    permissions: user.permissions,
  } satisfies AccessTokenPayload);

  const jti = uuidv4();
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion, jti });
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_TTL));

  await repo.createRefreshToken({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
    userAgent: ctx?.userAgent,
    ip: ctx?.ip,
  });

  return { accessToken, refreshToken, user };
};
