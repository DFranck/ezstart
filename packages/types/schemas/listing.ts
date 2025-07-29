import type { infer as ZodInfer } from 'zod';
import { z } from '../zod-extended';

export const listingQuerySchema = z.object({
  includeDeleted: z
    .preprocess(
      (v) => v === '1' || v === 'true' || v === true,
      z.boolean().optional()
    )
    .describe('Include soft-deleted items in the results (true/false)')
    .default(false)
    .openapi({ example: true }),

  deletedOnly: z
    .preprocess(
      (v) => v === '1' || v === 'true' || v === true,
      z.boolean().optional()
    )
    .describe('Return only soft-deleted items (true/false)')
    .default(false)
    .openapi({ example: false }),

  page: z
    .preprocess(
      (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
      z.number().min(1).optional()
    )
    .describe('Page number for pagination (min: 1)')
    .default(1)
    .openapi({ example: 2 }),

  limit: z
    .preprocess(
      (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
      z.number().min(1).max(100).optional()
    )
    .describe('Number of items per page (min: 1, max: 100)')
    .default(20)
    .openapi({ example: 50 }),

  from: z
    .string()
    .optional()
    .describe('Filter: createdAt >= from (ISO 8601 date)')
    .openapi({ example: '2025-01-01T00:00:00.000Z' }),

  to: z
    .string()
    .optional()
    .describe('Filter: createdAt <= to (ISO 8601 date)')
    .openapi({ example: '2025-01-31T23:59:59.999Z' }),
});

export type ListingQuery = ZodInfer<typeof listingQuerySchema>;
