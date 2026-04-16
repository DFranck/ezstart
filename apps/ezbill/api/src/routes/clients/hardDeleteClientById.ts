/**
 * DELETE /api/clients/:id/hard-delete
 * Hard delete Client (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/client/client.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const hardDeleteClientByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const hardDeleteClientByIdRouter = createRouterWithDoc(
  hardDeleteClientByIdRegistry,
  router,
  '/clients'
)

hardDeleteClientByIdRouter.delete(
  '/:id/hard-delete',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.hardDeleteSecureClientController,
  {
    summary: 'Hard delete Client (authenticated)',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
  }
)

export default router
