import { z, type infer as ZodInfer } from 'zod';

export const userRoleEnum = z.enum(['admin', 'user']);
export type UserRole = ZodInfer<typeof userRoleEnum>;