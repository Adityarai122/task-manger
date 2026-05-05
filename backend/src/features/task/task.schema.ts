import { z } from 'zod';

const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
const TaskPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

export const updateOwnTaskSchema = z.object({
  status: TaskStatus.optional(),
  description: z.string().trim().max(5000).optional(),
});
export type UpdateOwnTaskDto = z.infer<typeof updateOwnTaskSchema>;

export const listTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: TaskStatus.optional(),
  assigneeId: z.string().uuid().optional(),
  mine: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
