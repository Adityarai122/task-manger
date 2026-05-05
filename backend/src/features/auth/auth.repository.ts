import { prisma } from '@/core/db/prisma';

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({
    where: { email },
    include: {
      roles: { include: { role: true } },
    },
  });

export const findUserById = (id: string) =>
  prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
    },
  });

export const resolveUserPermissions = async (userId: string): Promise<string[]> => {
  const rows = await prisma.permission.findMany({
    where: {
      roles: {
        some: {
          role: { users: { some: { userId } } },
        },
      },
    },
    select: { key: true },
    orderBy: { key: 'asc' },
  });
  return rows.map((r) => r.key);
};

export const createRefreshToken = (data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}) => prisma.refreshToken.create({ data });

export const findRefreshTokenByHash = (tokenHash: string) =>
  prisma.refreshToken.findUnique({ where: { tokenHash } });

export const revokeRefreshToken = (id: string) =>
  prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
