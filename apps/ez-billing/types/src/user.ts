import { z, type Infer as ZodInfer } from '@ezstart/types';

export const userBaseSchema = z.object({
  username: z.string().min(1).describe('Unique username lowercase'),
});

export const createUserSchema = userBaseSchema;

export const userSchema = userBaseSchema.extend({
  _id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)'),

  createdAt: z.string().describe('ISO timestamp when the user was created'),
  updatedAt: z.string().describe('ISO timestamp when the user was last updated'),
});

export type CreateUser = ZodInfer<typeof createUserSchema>;
export type User = ZodInfer<typeof userSchema>;