/**
 * GET /api/companies
 * List Companies (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateQuery } from '@ezstart/api-core'
import { companySchema } from '@ezbill/types'
import { z } from 'zod'
import { getCompanies } from '../../controllers/company/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const listCompaniesRegistry = new OpenAPIRegistry()
const router = Router()
export const listCompaniesRouter = createRouterWithDoc(listCompaniesRegistry, router, '/companies')

const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().describe('Page number'),
  limit: z.coerce.number().int().positive().max(100).optional().describe('Items per page'),
  includeDeleted: z.enum(['true', 'false']).optional().describe('Include soft-deleted companies'),
  deletedOnly: z.enum(['true', 'false']).optional().describe('Only return soft-deleted companies'),
})

const paginatedCompaniesSchema = z.object({
  data: companySchema.array().describe('Array of company objects'),
  pagination: z
    .object({
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Items per page'),
      total: z.number().describe('Total number of items'),
      totalPages: z.number().describe('Total number of pages'),
    })
    .describe('Pagination metadata'),
})

listCompaniesRouter.get(
  '/',
  authMiddleware,
  validateQuery(listCompaniesQuerySchema),
  getCompanies,
  {
    summary: 'List Companies (authenticated)',
    tags: ['Companies'],
    querySchema: listCompaniesQuerySchema,
    responseSchema: paginatedCompaniesSchema,
  }
)

export default router
