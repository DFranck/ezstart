import { z } from 'zod';

export const baseClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
export type BaseClient = z.infer<typeof baseClientSchema>;
