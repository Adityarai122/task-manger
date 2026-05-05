// Route constants — single source of truth.
// Use these instead of inline strings so renames are mechanical.
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  profile: '/profile',
  projects: '/projects',
  projectDetail: (id = ':id') => `/projects/${id}`,
  tasks: '/tasks',
  users: '/admin/users',
  forbidden: '/403',
} as const;
