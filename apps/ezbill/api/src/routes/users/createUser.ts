/**
 * POST /api/users
 * Create User
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/api-core'
import { createUserSchema, userSchema } from '@ezbill/types'
import { createUser } from '../../controllers/user/index.js'

export const createUserRegistry = new OpenAPIRegistry()
const router = Router()
export const createUserRouter = createRouterWithDoc(createUserRegistry, router, '/users')

createUserRouter.post('/', createUser, {
  summary: 'Create User',
  tags: ['Users'],
  bodySchema: createUserSchema,
  responseSchema: userSchema,
  status: 201,
})

export default router
