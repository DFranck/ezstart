import { z } from '@ezstart/api-core';
import type { infer as ZodInfer } from 'zod';
import { listingQuerySchema } from './listing';

// -----------------------------------
// 🟢 BASE (never used alone)
export const baseClientSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  address: z.string().optional(),
  isCompany: z.boolean(),
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
export type ClientId = ZodInfer<typeof clientIdSchema>;

// Output
export const clientSchema = baseClientSchema.extend({
  taxNumber: z.string().optional(),
  _id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
});

// -----------------------------------
// 🟡 QUERY (listing/filter)
export const getClientsQuerySchema = listingQuerySchema.extend({});
export type GetClientsQuery = ZodInfer<typeof getClientsQuerySchema>;

// BASE
export type BaseClient = ZodInfer<typeof baseClientSchema>;
// Inputs
export type BillingClient = ZodInfer<typeof billingClientSchema>;
// Output
export type Client = ZodInfer<typeof clientSchema>;
