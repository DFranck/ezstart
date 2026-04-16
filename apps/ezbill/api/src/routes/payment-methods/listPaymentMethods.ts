/**
 * GET /api/payment-methods
 * List Payment Methods (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateQuery } from '@ezstart/api-core'
import { paymentMethodSchema } from '@ezbill/types'
import { z } from 'zod'
import { getPaymentMethods } from '../../controllers/payment-method/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const listPaymentMethodsRegistry = new OpenAPIRegistry()
const router = Router()
export const listPaymentMethodsRouter = createRouterWithDoc(
  listPaymentMethodsRegistry,
  router,
  '/payment-methods'
)

const listPaymentMethodsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().describe('Page number'),
  limit: z.coerce.number().int().positive().max(100).optional().describe('Items per page'),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .describe('Include soft-deleted payment methods'),
  deletedOnly: z
    .enum(['true', 'false'])
    .optional()
    .describe('Only return soft-deleted payment methods'),
})

const paginatedPaymentMethodsSchema = z.object({
  data: paymentMethodSchema.array().describe('Array of payment methods'),
  pagination: z
    .object({
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Items per page'),
      total: z.number().describe('Total number of items'),
      totalPages: z.number().describe('Total number of pages'),
    })
    .describe('Pagination metadata'),
})

listPaymentMethodsRouter.get(
  '/',
  authMiddleware,
  validateQuery(listPaymentMethodsQuerySchema),
  getPaymentMethods,
  {
    summary: 'List Payment Methods (authenticated)',
    tags: ['Payment Methods'],
    querySchema: listPaymentMethodsQuerySchema,
    responseSchema: paginatedPaymentMethodsSchema,
  }
)

export default router
