import { z } from 'zod';

export const inviteUserFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters').max(128),
  role: z.enum(['Admin', 'User']),
});
export type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

export const updateProfileFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  password: z.string().max(128).optional().or(z.literal('')),
}).refine((v) => !v.password || v.password.length >= 8, {
  message: 'Password must be at least 8 characters',
  path: ['password'],
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileFormSchema>;
