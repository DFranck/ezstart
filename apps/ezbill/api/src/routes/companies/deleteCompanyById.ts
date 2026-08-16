/**
 * DELETE /api/companies/:id
 * Soft delete Company (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import { deleteCompany } from '../../controllers/company/index.js'
import { authMiddleware } from '../../middleware/auth.js'

export const deleteCompanyByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const deleteCompanyByIdRouter = createRouterWithDoc(
  deleteCompanyByIdRegistry,
  router,
  '/companies'
)

deleteCompanyByIdRouter.delete(
  '/:id',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  deleteCompany,
  {
    summary: 'Soft delete Company (authenticated)',
    tags: ['Companies'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
