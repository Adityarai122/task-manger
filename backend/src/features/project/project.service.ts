import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/core/errors/AppError';
import type { Project, ProjectMember, User } from '@prisma/client';
import * as repo from './project.repository';
import type {
  CreateProjectDto,
  MemberDto,
  UpdateProjectDto,
} from './project.schema';

type ProjectWithRelations = Project & {
  owner: Pick<User, 'id' | 'name' | 'email'>;
  members: (ProjectMember & { user: Pick<User, 'id' | 'name' | 'email'> })[];
  _count: { tasks: number };
};

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  owner: { id: string; name: string; email: string };
  members: { id: string; name: string; email: string; addedAt: Date }[];
  taskCount: number;
}

const toView = (p: ProjectWithRelations): ProjectView => ({
  id: p.id,
  name: p.name,
  description: p.description,
  status: p.status,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  owner: p.owner,
  members: p.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    addedAt: m.addedAt,
  })),
  taskCount: p._count.tasks,
});

const isAdmin = (roles: string[]): boolean => roles.includes('Admin');

export const list = async (actor: { sub: string; roles: string[] }): Promise<ProjectView[]> => {
  const rows = isAdmin(actor.roles)
    ? await repo.listAll()
    : await repo.listForUser(actor.sub);
  return rows.map(toView);
};

export const getById = async (
  id: string,
  actor: { sub: string; roles: string[] },
): Promise<ProjectView> => {
  const project = await repo.findById(id);
  if (!project) throw new NotFoundError('Project not found');

  if (!isAdmin(actor.roles)) {
    const allowed = project.ownerId === actor.sub || project.members.some((m) => m.userId === actor.sub);
    if (!allowed) throw new ForbiddenError('You do not have access to this project');
  }
  return toView(project);
};

export const create = async (
  dto: CreateProjectDto,
  actor: { sub: string },
): Promise<ProjectView> => {
  const created = await repo.create({
    name: dto.name,
    description: dto.description,
    ownerId: actor.sub,
    memberIds: dto.memberIds,
  });
  return toView(created);
};

export const update = async (id: string, dto: UpdateProjectDto): Promise<ProjectView> => {
  const project = await repo.findById(id);
  if (!project) throw new NotFoundError('Project not found');
  const updated = await repo.update(id, dto);
  return toView(updated);
};

export const remove = async (id: string): Promise<void> => {
  const project = await repo.findById(id);
  if (!project) throw new NotFoundError('Project not found');
  await repo.remove(id);
};

export const addMember = async (id: string, dto: MemberDto): Promise<ProjectView> => {
  const project = await repo.findById(id);
  if (!project) throw new NotFoundError('Project not found');
  if (project.ownerId === dto.userId) {
    throw new ConflictError('Owner is already a member');
  }
  const updated = await repo.addMember(id, dto.userId);
  if (!updated) throw new NotFoundError('Project not found');
  return toView(updated);
};

export const removeMember = async (id: string, userId: string): Promise<ProjectView> => {
  const project = await repo.findById(id);
  if (!project) throw new NotFoundError('Project not found');
  if (project.ownerId === userId) {
    throw new ForbiddenError('Cannot remove the project owner');
  }
  const updated = await repo.removeMember(id, userId);
  if (!updated) throw new NotFoundError('Project not found');
  return toView(updated);
};

export const isUserMember = (projectId: string, userId: string): Promise<boolean> =>
  repo.isMember(projectId, userId);
