import { z } from '@ezstart/api-core';
import { withExample } from '@ezstart/api-core/src/openapi/z-object-helper';
import type { infer as ZodInfer } from 'zod';
import { listingQuerySchema } from './listing';

// -----------------------------------
// 🟢 BASE (never used alone)
export const baseClientSchema = z.object({
  clientName: withExample(
    z
      .string()
      .min(1, 'Client name is required')
      .describe('Full name of the client or company'),
    'ACME Corp'
  ),

  address: withExample(
    z.string().optional().describe('Postal address of the client'),
    '123 Main St, Paris'
  ),

  isCompany: withExample(
    z.boolean().describe('true if company, false if individual'),
    true
  ),

  phone: withExample(
    z.string().optional().describe('Phone number of the client'),
    '+33 6 12 34 56 78'
  ),

  notes: z.string().optional().describe('Internal notes about the client'),
});

// -----------------------------------
// 🟢 INPUTS (create/update)
export const billingClientSchema = baseClientSchema.extend({
  taxNumber: withExample(
    z
      .string()
      .optional()
      .describe('Optional VAT / tax identification number of the client'),
    'FR123456789'
  ),
});

export const clientIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});
export type ClientId = ZodInfer<typeof clientIdSchema>;

// Output
export const clientSchema = baseClientSchema.extend({
  taxNumber: withExample(
    z
      .string()
      .optional()
      .describe('Optional VAT / tax identification number of the client'),
    'FR123456789'
  ),

  _id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)')
    .openapi({ example: '64abcda2d57c3adc668f1b2' }),

  createdAt: z.string().describe('ISO timestamp when the client was created'),

  updatedAt: z
    .string()
    .describe('ISO timestamp when the client was last updated'),

  deletedAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the client was soft-deleted'),
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
