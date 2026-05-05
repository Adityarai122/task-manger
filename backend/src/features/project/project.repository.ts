import type { Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '@/core/db/prisma';

const projectInclude = {
  owner: { select: { id: true, name: true, email: true } },
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectInclude;

export const listAll = () =>
  prisma.project.findMany({
    include: projectInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

export const listForUser = (userId: string) =>
  prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: projectInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

export const findById = (id: string) =>
  prisma.project.findUnique({ where: { id }, include: projectInclude });

export const isMember = async (projectId: string, userId: string): Promise<boolean> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: { where: { userId }, select: { userId: true } },
    },
  });
  if (!project) return false;
  return project.ownerId === userId || project.members.length > 0;
};

interface CreateInput {
  name: string;
  description?: string;
  ownerId: string;
  memberIds?: string[];
}

export const create = async (input: CreateInput) =>
  prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      members: input.memberIds?.length
        ? { create: input.memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: projectInclude,
  });

interface UpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export const update = (id: string, data: UpdateInput) =>
  prisma.project.update({ where: { id }, data, include: projectInclude });

export const remove = (id: string) => prisma.project.delete({ where: { id } });

export const addMember = async (projectId: string, userId: string) => {
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  });
  return findById(projectId);
};

export const removeMember = async (projectId: string, userId: string) => {
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  return findById(projectId);
};
