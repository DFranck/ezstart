import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
} from '@ezstart/express-core'
import { gameSchema, paramsMongoIdSchema } from '@tower-defense/types'
import { getGameByIdController } from '../../controllers/getGameByIdController.js'

export const getGameByIdRegistry = new OpenAPIRegistry()
const router = Router()

const docRouter = createRouterWithDoc(getGameByIdRegistry, router)

docRouter.get('/:id', validateParams(paramsMongoIdSchema), getGameByIdController, {
  summary: 'Get a Game',
  tags: ['Games'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: gameSchema,
})

export { getGameByIdRegistry as registry, router }
export default router
