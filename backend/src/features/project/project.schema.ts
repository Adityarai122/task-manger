import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

export const memberSchema = z.object({
  userId: z.string().uuid(),
});
export type MemberDto = z.infer<typeof memberSchema>;
