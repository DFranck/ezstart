import { z } from 'zod';

export const listingQuerySchema = z.object({
  includeDeleted: z.preprocess(
    (v) => v === '1' || v === 'true' || v === true,
    z.boolean().optional()
  ),
  deletedOnly: z.preprocess(
    (v) => v === '1' || v === 'true' || v === true,
    z.boolean().optional()
  ),
  page: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
    z.number().min(1).optional()
  ),
  limit: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
    z.number().min(1).max(100).optional()
  ),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ListingQuery = z.infer<typeof listingQuerySchema>;
