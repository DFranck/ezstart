/**
 * POST /api/clients/:id/restore
 * Restore Client (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry, validateParams } from '@ezstart/api-core'
import { paramsMongoIdSchema, clientSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/client/client.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const restoreClientByIdRegistry = new OpenAPIRegistry()
const router = Router()
export const restoreClientByIdRouter = createRouterWithDoc(
  restoreClientByIdRegistry,
  router,
  '/clients'
)

restoreClientByIdRouter.post(
  '/:id/restore',
  authMiddleware,
  validateParams(paramsMongoIdSchema),
  secureControllers.restoreSecureClientController,
  {
    summary: 'Restore Client (authenticated)',
    tags: ['Clients'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: clientSchema,
  }
)

export default router
