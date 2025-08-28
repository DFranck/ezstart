import { z } from '@ezstart/types';

export const userRoleEnum = z.enum(['admin', 'user']);
export type UserRole = z.infer<typeof userRoleEnum>;