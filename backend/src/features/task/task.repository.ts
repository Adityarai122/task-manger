import type { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '@/core/db/prisma';

const taskInclude = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TaskInclude;

export const list = (where: Prisma.TaskWhereInput) =>
  prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });

export const findById = (id: string) =>
  prisma.task.findUnique({ where: { id }, include: taskInclude });

interface CreateInput {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string | null;
  createdById: string;
  dueDate?: Date | null;
}

export const create = (input: CreateInput) =>
  prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: input.status ?? 'TODO',
      priority: input.priority ?? 'MEDIUM',
      assigneeId: input.assigneeId ?? null,
      createdById: input.createdById,
      dueDate: input.dueDate ?? null,
    },
    include: taskInclude,
  });

interface UpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
}

export const update = (id: string, data: UpdateInput) =>
  prisma.task.update({ where: { id }, data, include: taskInclude });

export const remove = (id: string) => prisma.task.delete({ where: { id } });

// Aggregates for dashboard
export const countByStatus = async (where: Prisma.TaskWhereInput) => {
  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });
  const result: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  for (const row of grouped) result[row.status] = row._count._all;
  return result;
};

export const countOverdue = (where: Prisma.TaskWhereInput) =>
  prisma.task.count({
    where: {
      ...where,
      status: { not: 'DONE' },
      dueDate: { lt: new Date() },
    },
  });

export const findRecent = (where: Prisma.TaskWhereInput, take: number) =>
  prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { updatedAt: 'desc' },
    take,
  });
