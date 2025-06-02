import { z } from 'zod';
import { getPaginatedListQuerySchema } from './listing';

// -----------------------------------
// 🟢 BASE (never used alone)
export const baseClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// -----------------------------------
// 🟢 INPUTS (create/update)
export const billingClientSchema = baseClientSchema.extend({
  taxNumber: z.string().optional(),
});

export const clientIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});
export type ClientId = z.infer<typeof clientIdSchema>;

// Output
export const clientSchema = baseClientSchema.extend({
  _id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});

// -----------------------------------
// 🟡 QUERY (listing/filter)
export const getClientsQuerySchema = getPaginatedListQuerySchema.extend({});
export type GetClientsQuery = z.infer<typeof getClientsQuerySchema>;

// BASE
export type BaseClient = z.infer<typeof baseClientSchema>;
// Inputs
export type BillingClient = z.infer<typeof billingClientSchema>;
// Output
export type Client = z.infer<typeof clientSchema>;
