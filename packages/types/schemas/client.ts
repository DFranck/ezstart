import { z } from 'zod';
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
export const billingClientSchema = baseClientSchema
  .extend({
    taxNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isCompany) {
      if (!data.taxNumber || data.taxNumber.trim() === '') {
        ctx.addIssue({
          path: ['taxNumber'],
          message: 'Tax number is required for companies.',
          code: z.ZodIssueCode.custom,
        });
      }
      if (!data.address || data.address.trim() === '') {
        ctx.addIssue({
          path: ['address'],
          message: 'Address is required for companies.',
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

export const clientIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});
export type ClientId = z.infer<typeof clientIdSchema>;

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
export type GetClientsQuery = z.infer<typeof getClientsQuerySchema>;

// BASE
export type BaseClient = z.infer<typeof baseClientSchema>;
// Inputs
export type BillingClient = z.infer<typeof billingClientSchema>;
// Output
export type Client = z.infer<typeof clientSchema>;
