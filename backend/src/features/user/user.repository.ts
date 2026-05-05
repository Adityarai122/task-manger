import { prisma } from '@/core/db/prisma';

const userInclude = {
  roles: { include: { role: true } },
};

export const listAll = () =>
  prisma.user.findMany({
    where: { deletedAt: null },
    include: userInclude,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });

export const findById = (id: string) =>
  prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: userInclude,
  });

export const findByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email }, include: userInclude });

export const findRoleByName = (name: string) =>
  prisma.role.findUnique({ where: { name } });

interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
  roleId: string;
}

export const create = async (input: CreateUserInput) =>
  prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      roles: { create: { roleId: input.roleId } },
    },
    include: userInclude,
  });

interface UpdateInput {
  name?: string;
  email?: string;
  isActive?: boolean;
  passwordHash?: string;
}

export const update = (id: string, data: UpdateInput) =>
  prisma.user.update({
    where: { id },
    data,
    include: userInclude,
  });

// Replace role assignment: remove all current roles, then assign the new one.
export const setRole = async (userId: string, roleId: string) => {
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.create({ data: { userId, roleId } }),
    // Bumping tokenVersion will invalidate any in-flight refresh tokens for this user
    // so the role change takes effect on next refresh.
    prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    }),
  ]);
  return findById(userId);
};

export const softDelete = (id: string) =>
  prisma.user.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date(), tokenVersion: { increment: 1 } },
  });

export const countAdmins = () =>
  prisma.user.count({
    where: {
      isActive: true,
      deletedAt: null,
      roles: { some: { role: { name: 'Admin' } } },
    },
  });
