// Extended Zod with OpenAPI support for APIs
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z as baseZod } from 'zod'

extendZodWithOpenApi(baseZod)

/**
 * Zod instance extended with OpenAPI support.
 * Use this instead of importing from 'zod' directly to ensure OpenAPI metadata is included.
 *
 * @example
 * ```typescript
 * import { z } from '@ezstart/types'
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number()
 * })
 * ```
 */
export const z = baseZod
export type { infer as Infer, input as Input } from 'zod'

/**
 * Validates MongoDB ObjectId format (24-character hexadecimal string).
 *
 * Accepts both lowercase and uppercase hex characters (case-insensitive).
 *
 * @example
 * ```typescript
 * const userIdSchema = z.object({
 *   userId: mongoIdSchema
 * })
 *
 * // ✅ Valid
 * userIdSchema.parse({ userId: '507f1f77bcf86cd799439011' })
 *
 * // ❌ Throws ZodError
 * userIdSchema.parse({ userId: 'invalid' })
 * userIdSchema.parse({ userId: '507f1f77' }) // too short
 * ```
 */
export const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .min(1, 'ID is required')
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
  .describe('MongoDB ObjectId')

/**
 * Generic query schema for paginated listings with optional filtering.
 *
 * Supports:
 * - Pagination (page, limit)
 * - Soft-delete filtering (includeDeleted, deletedOnly)
 * - Date range filtering (from, to)
 *
 * String query parameters are automatically converted to the correct types using `.preprocess()`.
 *
 * @example
 * ```typescript
 * // In API route
 * import { listingQuerySchema } from '@ezstart/types'
 *
 * const query = listingQuerySchema.parse(req.query)
 * // query.page = 1 (default)
 * // query.limit = 20 (default)
 * // query.includeDeleted = false (default)
 *
 * const items = await Item.find()
 *   .skip((query.page - 1) * query.limit)
 *   .limit(query.limit)
 * ```
 *
 * @example
 * ```typescript
 * // Extend for project-specific filters
 * const invoiceQuerySchema = listingQuerySchema.extend({
 *   status: z.enum(['draft', 'sent', 'paid']).optional(),
 *   clientId: z.string().optional()
 * })
 * ```
 */
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