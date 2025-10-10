import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
  z,
} from '@ezstart/express-core'
import { createUser, getUserByUsername } from '../controllers/user/index.js'
import { createUserSchema, userSchema } from '@ezbill/types'

const usernameParamsSchema = z.object({
  username: z.string().min(1).describe('Username to search for')
})

export const usersRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(usersRegistry, router, '/users')

docRouter.post('/', createUser, {
  summary: 'Create User',
  tags: ['Users'],
  bodySchema: createUserSchema,
  responseSchema: userSchema,
  status: 201,
})

docRouter.get('/:username', validateParams(usernameParamsSchema), getUserByUsername, {
  summary: 'Get User by Username',
  tags: ['Users'],
  paramsSchema: usernameParamsSchema,
  responseSchema: userSchema,
})

export default router