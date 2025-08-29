import { z, type Infer as ZodInfer } from '@ezstart/types';

export const userRoleEnum = z.enum(['admin', 'user']);
export type UserRole = ZodInfer<typeof userRoleEnum>;