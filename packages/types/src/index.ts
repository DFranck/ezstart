// Extended Zod with OpenAPI support for APIs
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z as baseZod } from 'zod'

extendZodWithOpenApi(baseZod)

export const z = baseZod
export type { infer as Infer, input as Input } from 'zod'

// Common schemas that are truly shared across APIs
export const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .min(1, 'ID is required')
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
  .describe('MongoDB ObjectId')

export const listingQuerySchema = z.object({
  includeDeleted: z
    .preprocess(
      (v) => v === '1' || v === 'true' || v === true,
      z.boolean().optional()
    )
    .describe('Include soft-deleted items in the results (true/false)')
    .default(false),

  deletedOnly: z
    .preprocess(
      (v) => v === '1' || v === 'true' || v === true,
      z.boolean().optional()
    )
    .describe('Return only soft-deleted items (true/false)')
    .default(false),

  page: z
    .preprocess(
      (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
      z.number().min(1).optional()
    )
    .describe('Page number for pagination (min: 1)')
    .default(1),

  limit: z
    .preprocess(
      (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
      z.number().min(1).max(100).optional()
    )
    .describe('Number of items per page (min: 1, max: 100)')
    .default(20),

  from: z
    .string()
    .optional()
    .describe('Filter: createdAt >= from (ISO 8601 date)'),

  to: z
    .string()
    .optional()
    .describe('Filter: createdAt <= to (ISO 8601 date)'),
})

export type ListingQuery = baseZod.infer<typeof listingQuerySchema>