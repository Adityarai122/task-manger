import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/core/errors/AppError';
import { hashPassword } from '@/core/utils/password';
import { ROLE_ADMIN, type SystemRoleName } from '@/core/constants/permissions';
import * as repo from './user.repository';
import type {
  ChangeRoleDto,
  InviteUserDto,
  UpdateSelfDto,
  UpdateUserDto,
} from './user.schema';

// DTO returned to clients — never expose passwordHash.
export interface UserView {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const toView = (u: Awaited<ReturnType<typeof repo.findById>>): UserView => {
  if (!u) throw new NotFoundError('User not found');
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    roles: u.roles.map((r) => r.role.name),
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
};

export const list = async (): Promise<UserView[]> => {
  const rows = await repo.listAll();
  return rows.map((u) => toView(u));
};

export const getById = async (id: string): Promise<UserView> => {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return toView(user);
};

export const invite = async (dto: InviteUserDto): Promise<UserView> => {
  const existing = await repo.findByEmail(dto.email);
  if (existing) throw new ConflictError('Email already registered');

  const role = await repo.findRoleByName(dto.role);
  if (!role) throw new BadRequestError(`Role ${dto.role} does not exist`);

  const passwordHash = await hashPassword(dto.password);
  const created = await repo.create({
    email: dto.email,
    name: dto.name,
    passwordHash,
    roleId: role.id,
  });
  return toView(created);
};

export const update = async (id: string, dto: UpdateUserDto): Promise<UserView> => {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError('User not found');

  // Last-admin guard: prevent deactivating the only Admin in the system.
  if (dto.isActive === false && user.isActive) {
    const isAdmin = user.roles.some((r) => r.role.name === ROLE_ADMIN);
    if (isAdmin) {
      const adminCount = await repo.countAdmins();
      if (adminCount <= 1) {
        throw new BadRequestError('Cannot deactivate the only remaining admin');
      }
    }
  }

  if (dto.email && dto.email !== user.email) {
    const clash = await repo.findByEmail(dto.email);
    if (clash) throw new ConflictError('Email already in use');
  }

  const updated = await repo.update(id, dto);
  return toView(updated);
};

export const changeRole = async (
  id: string,
  dto: ChangeRoleDto,
  actorId: string,
): Promise<UserView> => {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError('User not found');

  const currentRoles = user.roles.map((r) => r.role.name);
  const isCurrentlyAdmin = currentRoles.includes(ROLE_ADMIN);
  const targetIsAdmin = dto.role === ROLE_ADMIN;

  // Prevent self-demotion (can't undo your own admin)
  if (id === actorId && isCurrentlyAdmin && !targetIsAdmin) {
    throw new ForbiddenError('You cannot demote yourself');
  }

  // Last-admin guard: must keep at least one active admin
  if (isCurrentlyAdmin && !targetIsAdmin) {
    const adminCount = await repo.countAdmins();
    if (adminCount <= 1) {
      throw new BadRequestError('Cannot demote the only remaining admin');
    }
  }

  const role = await repo.findRoleByName(dto.role);
  if (!role) throw new BadRequestError(`Role ${dto.role} does not exist`);

  const updated = await repo.setRole(id, role.id);
  return toView(updated);
};

export const deactivate = async (id: string, actorId: string): Promise<void> => {
  if (id === actorId) {
    throw new ForbiddenError('You cannot deactivate yourself');
  }
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError('User not found');

  // Last-admin guard
  const isAdmin = user.roles.some((r) => r.role.name === ROLE_ADMIN);
  if (isAdmin && user.isActive) {
    const adminCount = await repo.countAdmins();
    if (adminCount <= 1) {
      throw new BadRequestError('Cannot deactivate the only remaining admin');
    }
  }
  await repo.softDelete(id);
};

export const updateSelf = async (id: string, dto: UpdateSelfDto): Promise<UserView> => {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError('User not found');

  const data: { name?: string; passwordHash?: string } = {};
  if (dto.name) data.name = dto.name;
  if (dto.password) data.passwordHash = await hashPassword(dto.password);

  const updated = await repo.update(id, data);
  return toView(updated);
};

// Helper: surface the seeded admin role name for type safety in routes.
export const SUPPORTED_ROLES: SystemRoleName[] = ['Admin', 'User'];
