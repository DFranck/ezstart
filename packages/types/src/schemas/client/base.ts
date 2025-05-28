import { z } from 'zod';

export const baseClientSchema = z.object({
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type BaseClient = z.infer<typeof baseClientSchema>;
