import { z } from 'zod';

const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
const TaskPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskFormSchema = z.object({
  title: z.string().trim().min(2, 'Title is too short').max(200),
  description: z.string().trim().max(5000).optional(),
  status: TaskStatus.default('TODO'),
  priority: TaskPriority.default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});
export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;
