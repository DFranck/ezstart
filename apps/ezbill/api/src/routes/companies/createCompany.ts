/**
 * POST /api/companies
 * Create Company (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/api-core'
import { companySchema, createCompanySchema } from '@ezbill/types'
import { createCompany } from '../../controllers/company/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const createCompanyRegistry = new OpenAPIRegistry()
const router = Router()
export const createCompanyRouter = createRouterWithDoc(createCompanyRegistry, router, '/companies')

createCompanyRouter.post('/', authMiddleware, createCompany, {
  summary: 'Create Company (authenticated)',
  tags: ['Companies'],
  bodySchema: createCompanySchema,
  responseSchema: companySchema,
  status: 201,
})

export default router
