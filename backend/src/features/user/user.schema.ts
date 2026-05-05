import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(128),
  role: z.enum(['Admin', 'User']).default('User'),
});
export type InviteUserDto = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const changeRoleSchema = z.object({
  role: z.enum(['Admin', 'User']),
});
export type ChangeRoleDto = z.infer<typeof changeRoleSchema>;

export const updateSelfSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  password: z.string().min(8).max(128).optional(),
});
export type UpdateSelfDto = z.infer<typeof updateSelfSchema>;
