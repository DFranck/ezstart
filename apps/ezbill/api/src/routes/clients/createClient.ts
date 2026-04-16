/**
 * POST /api/clients
 * Create a Client (authenticated)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/api-core'
import { billingClientSchema, clientSchema } from '@ezbill/types'
import * as secureControllers from '../../controllers/client/client.secure-controllers.js'
import { authMiddleware } from '../../middleware/auth.js'

export const createClientRegistry = new OpenAPIRegistry()
const router = Router()
export const createClientRouter = createRouterWithDoc(createClientRegistry, router, '/clients')

createClientRouter.post('/', authMiddleware, secureControllers.createSecureClientController, {
  summary: 'Create a Client (authenticated)',
  tags: ['Clients'],
  bodySchema: billingClientSchema,
  responseSchema: clientSchema,
  status: 201,
})

export default router
