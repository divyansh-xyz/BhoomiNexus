import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Official email ID is required' })
    .email({ message: 'Enter a valid official email address (e.g. officer@gov.demo)' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
  department: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
