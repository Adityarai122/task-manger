import { z } from 'zod';

// Mirrors backend constraints (auth.schema.ts).
export const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;
