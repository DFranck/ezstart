import z from 'zod';
import { baseClientSchema } from './base';

export const clientSchema = baseClientSchema.extend({
  _id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});
export type Client = z.infer<typeof clientSchema>;
