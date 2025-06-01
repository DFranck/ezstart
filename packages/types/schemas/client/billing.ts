import z from 'zod';
import { baseClientSchema } from './base';

export const billingClientSchema = baseClientSchema.extend({
  taxNumber: z.string().optional(),
});

export type BillingClient = z.infer<typeof billingClientSchema>;
