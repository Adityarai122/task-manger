import { z } from 'zod';

export const createProjectFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  description: z.string().trim().max(2000).optional(),
});
export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;
