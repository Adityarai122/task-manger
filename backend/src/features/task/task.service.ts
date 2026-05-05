import type { Prisma, Task, User, Project } from '@prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors/AppError';
import * as repo from './task.repository';
import * as projectRepo from '@/features/project/project.repository';
import type {
  CreateTaskDto,
  ListTasksQuery,
  UpdateOwnTaskDto,
  UpdateTaskDto,
} from './task.schema';

type TaskWithRelations = Task & {
  project: Pick<Project, 'id' | 'name'>;
  assignee: Pick<User, 'id' | 'name' | 'email'> | null;
  createdBy: Pick<User, 'id' | 'name' | 'email'>;
};

export interface TaskView {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
}

const toView = (t: TaskWithRelations): TaskView => ({
  id: t.id,
  projectId: t.projectId,
  projectName: t.project.name,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate,
  completedAt: t.completedAt,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  assignee: t.assignee,
  createdBy: t.createdBy,
});

const isAdmin = (roles: string[]): boolean => roles.includes('Admin');

// Build a Prisma where clause that constrains a non-admin to tasks they
// can see: assigned to them, created by them, or in projects they belong to.
const userScopeFilter = (userId: string): Prisma.TaskWhereInput => ({
  OR: [
    { assigneeId: userId },
    { createdById: userId },
    { project: { ownerId: userId } },
    { project: { members: { some: { userId } } } },
  ],
});

export const list = async (
  actor: { sub: string; roles: string[] },
  query: ListTasksQuery,
): Promise<TaskView[]> => {
  const where: Prisma.TaskWhereInput = {};

  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;
  if (query.assigneeId) where.assigneeId = query.assigneeId;
  if (query.mine) where.assigneeId = actor.sub;

  if (!isAdmin(actor.roles)) {
    where.AND = [userScopeFilter(actor.sub)];
  }

  const rows = await repo.list(where);
  return rows.map(toView);
};

export const getById = async (
  id: string,
  actor: { sub: string; roles: string[] },
): Promise<TaskView> => {
  const task = await repo.findById(id);
  if (!task) throw new NotFoundError('Task not found');

  if (!isAdmin(actor.roles)) {
    const allowed = await canUserSeeTask(actor.sub, task);
    if (!allowed) throw new ForbiddenError('You do not have access to this task');
  }
  return toView(task);
};

export const create = async (
  dto: CreateTaskDto,
  actor: { sub: string; roles: string[] },
): Promise<TaskView> => {
  const project = await projectRepo.findById(dto.projectId);
  if (!project) throw new NotFoundError('Project not found');

  // Non-admins can only create tasks in projects where they are a member,
  // and may only assign to fellow members of that project (or leave unassigned).
  if (!isAdmin(actor.roles)) {
    const isProjectMember = await projectRepo.isMember(dto.projectId, actor.sub);
    if (!isProjectMember) {
      throw new ForbiddenError('You can only create tasks in projects you belong to');
    }
    if (dto.assigneeId) {
      const assigneeIsMember = await projectRepo.isMember(dto.projectId, dto.assigneeId);
      if (!assigneeIsMember) {
        throw new BadRequestError('Assignee must be a member of this project');
      }
    }
  }

  const created = await repo.create({
    projectId: dto.projectId,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    priority: dto.priority,
    assigneeId: dto.assigneeId ?? null,
    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    createdById: actor.sub,
  });
  return toView(created);
};

export const update = async (id: string, dto: UpdateTaskDto): Promise<TaskView> => {
  const task = await repo.findById(id);
  if (!task) throw new NotFoundError('Task not found');

  const data: Parameters<typeof repo.update>[1] = {};
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.priority !== undefined) data.priority = dto.priority;
  if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
  if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
  if (dto.status !== undefined) {
    data.status = dto.status;
    data.completedAt = dto.status === 'DONE' ? new Date() : null;
  }

  const updated = await repo.update(id, data);
  return toView(updated);
};

export const updateOwn = async (
  id: string,
  dto: UpdateOwnTaskDto,
  actor: { sub: string },
): Promise<TaskView> => {
  const task = await repo.findById(id);
  if (!task) throw new NotFoundError('Task not found');
  if (task.assigneeId !== actor.sub) {
    throw new ForbiddenError('You can only update tasks assigned to you');
  }

  const data: Parameters<typeof repo.update>[1] = {};
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.status !== undefined) {
    data.status = dto.status;
    data.completedAt = dto.status === 'DONE' ? new Date() : null;
  }

  const updated = await repo.update(id, data);
  return toView(updated);
};

export const remove = async (id: string): Promise<void> => {
  const task = await repo.findById(id);
  if (!task) throw new NotFoundError('Task not found');
  await repo.remove(id);
};

const canUserSeeTask = async (
  userId: string,
  task: TaskWithRelations,
): Promise<boolean> => {
  if (task.assigneeId === userId || task.createdBy.id === userId) return true;
  return projectRepo.isMember(task.projectId, userId);
};
