import type { Prisma } from '@prisma/client';
import { prisma } from '@/core/db/prisma';
import * as taskRepo from '@/features/task/task.repository';

interface Actor {
  sub: string;
  roles: string[];
}

const isAdmin = (roles: string[]): boolean => roles.includes('Admin');

const taskScopeFilter = (actor: Actor): Prisma.TaskWhereInput => {
  if (isAdmin(actor.roles)) return {};
  return {
    OR: [
      { assigneeId: actor.sub },
      { createdById: actor.sub },
      { project: { ownerId: actor.sub } },
      { project: { members: { some: { userId: actor.sub } } } },
    ],
  };
};

const projectScopeFilter = (actor: Actor): Prisma.ProjectWhereInput => {
  if (isAdmin(actor.roles)) return {};
  return {
    OR: [{ ownerId: actor.sub }, { members: { some: { userId: actor.sub } } }],
  };
};

export interface DashboardSnapshot {
  scope: 'company' | 'self';
  projects: { active: number; archived: number; total: number };
  tasks: {
    total: number;
    byStatus: { TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number };
    overdue: number;
    assignedToMe: number;
  };
  users: { total: number; active: number } | null;
  recentTasks: Awaited<ReturnType<typeof taskRepo.findRecent>>;
}

export const get = async (actor: Actor): Promise<DashboardSnapshot> => {
  const taskWhere = taskScopeFilter(actor);
  const projectWhere = projectScopeFilter(actor);

  const [
    activeProjects,
    archivedProjects,
    byStatus,
    overdue,
    assignedToMe,
    recentTasks,
    userTotals,
  ] = await Promise.all([
    prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
    prisma.project.count({ where: { ...projectWhere, status: 'ARCHIVED' } }),
    taskRepo.countByStatus(taskWhere),
    taskRepo.countOverdue(taskWhere),
    prisma.task.count({ where: { ...taskWhere, assigneeId: actor.sub } }),
    taskRepo.findRecent(taskWhere, 5),
    isAdmin(actor.roles)
      ? Promise.all([
          prisma.user.count({ where: { deletedAt: null } }),
          prisma.user.count({ where: { deletedAt: null, isActive: true } }),
        ])
      : Promise.resolve(null),
  ]);

  const tasksTotal = byStatus.TODO + byStatus.IN_PROGRESS + byStatus.IN_REVIEW + byStatus.DONE;

  return {
    scope: isAdmin(actor.roles) ? 'company' : 'self',
    projects: {
      active: activeProjects,
      archived: archivedProjects,
      total: activeProjects + archivedProjects,
    },
    tasks: {
      total: tasksTotal,
      byStatus,
      overdue,
      assignedToMe,
    },
    users: userTotals ? { total: userTotals[0], active: userTotals[1] } : null,
    recentTasks,
  };
};
