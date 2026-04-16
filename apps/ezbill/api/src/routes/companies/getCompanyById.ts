/**
 * GET /api/companies/:id
 * Get Company by ID (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { companySchema, paramsMongoIdSchema } from '@ezbill/types'
import { getCompanyById } from '../../controllers/company/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const getCompanyByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const getCompanyByIdRouter = createRouterWithDoc(
  getCompanyByIdRegistry,
  router,
  '/companies'
)

getCompanyByIdRouter.get(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  getCompanyById,
  {
    summary: 'Get Company by ID (authenticated)',
    tags: ['Companies'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: companySchema,
  }
)

export default router
