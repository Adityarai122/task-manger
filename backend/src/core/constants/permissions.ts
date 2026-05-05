// Single source of truth for all permission keys.
// Two roles: Admin (all permissions), User (limited).

export const PERMISSIONS = {
  // ── User management (Admin only) ────────────────────────
  USER_CREATE: { key: 'user.create', module: 'user', description: 'Invite/create users' },
  USER_READ: { key: 'user.read', module: 'user', description: 'List & view all users' },
  USER_UPDATE: { key: 'user.update', module: 'user', description: 'Update any user' },
  USER_DELETE: { key: 'user.delete', module: 'user', description: 'Deactivate users' },
  USER_ROLE_CHANGE: { key: 'user.role.change', module: 'user', description: 'Promote/demote between Admin and User' },

  // ── Self (every authenticated user) ─────────────────────
  SELF_READ: { key: 'self.read', module: 'self', description: 'Read own profile' },
  SELF_UPDATE: { key: 'self.update', module: 'self', description: 'Update own profile' },

  // ── Project ─────────────────────────────────────────────
  PROJECT_CREATE: { key: 'project.create', module: 'project', description: 'Create projects (Admin)' },
  PROJECT_READ: { key: 'project.read', module: 'project', description: 'Read projects (own membership for User; all for Admin)' },
  PROJECT_UPDATE: { key: 'project.update', module: 'project', description: 'Update projects (Admin)' },
  PROJECT_DELETE: { key: 'project.delete', module: 'project', description: 'Delete projects (Admin)' },
  PROJECT_MEMBER_MANAGE: { key: 'project.member.manage', module: 'project', description: 'Add/remove project members (Admin)' },

  // ── Task ────────────────────────────────────────────────
  TASK_CREATE: { key: 'task.create', module: 'task', description: 'Create tasks anywhere (Admin)' },
  TASK_CREATE_MEMBER: {
    key: 'task.create.member',
    module: 'task',
    description: 'Create & assign tasks within projects you are a member of',
  },
  TASK_READ: { key: 'task.read', module: 'task', description: 'Read tasks (own/assigned for User; all for Admin)' },
  TASK_UPDATE: { key: 'task.update', module: 'task', description: 'Update any task (Admin)' },
  TASK_UPDATE_OWN: { key: 'task.update.own', module: 'task', description: 'Update tasks assigned to self (User)' },
  TASK_DELETE: { key: 'task.delete', module: 'task', description: 'Delete tasks (Admin)' },
  TASK_ASSIGN: { key: 'task.assign', module: 'task', description: 'Assign tasks to users (Admin)' },
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]['key'];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Permissions per system role.
export const SYSTEM_ROLE_PERMISSIONS = {
  Admin: ALL_PERMISSIONS.map((p) => p.key),

  User: [
    PERMISSIONS.SELF_READ.key,
    PERMISSIONS.SELF_UPDATE.key,
    PERMISSIONS.PROJECT_READ.key,
    PERMISSIONS.TASK_READ.key,
    PERMISSIONS.TASK_UPDATE_OWN.key,
    PERMISSIONS.TASK_CREATE_MEMBER.key,
  ] as PermissionKey[],
} as const;

export type SystemRoleName = keyof typeof SYSTEM_ROLE_PERMISSIONS;
export const SYSTEM_ROLE_NAMES = Object.keys(SYSTEM_ROLE_PERMISSIONS) as SystemRoleName[];
export const ROLE_ADMIN: SystemRoleName = 'Admin';
export const ROLE_USER: SystemRoleName = 'User';
