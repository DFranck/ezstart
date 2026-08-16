/**
 * PUT /api/companies/:id
 * Update Company (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { companySchema, createCompanySchema, paramsMongoIdSchema } from '@ezbill/types'
import { updateCompany } from '../../controllers/company/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const updateCompanyByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const updateCompanyByIdRouter = createRouterWithDoc(
  updateCompanyByIdRegistry,
  router,
  '/companies'
)

updateCompanyByIdRouter.put(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  updateCompany,
  {
    summary: 'Update Company (authenticated)',
    tags: ['Companies'],
    bodySchema: createCompanySchema,
    paramsSchema: paramsMongoIdSchema,
    responseSchema: companySchema,
  }
)

export default router
