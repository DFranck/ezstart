// baseClientSchema: le "shape" de tous les clients
import { z } from 'zod';

export const baseClientSchema = z.object({
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
export type BaseClient = z.infer<typeof baseClientSchema>;
