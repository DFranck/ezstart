import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
} from '@ezstart/express-core'
import { gameSchema, paramsMongoIdSchema } from '@tower-defense/types'
import { startGameController } from '../../controllers/startGameController.js'

export const startGameRegistry = new OpenAPIRegistry()
const router = Router()

const docRouter = createRouterWithDoc(startGameRegistry, router)

docRouter.post('/:id/start', validateParams(paramsMongoIdSchema), startGameController, {
  summary: 'Start a Game',
  tags: ['Games'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: gameSchema,
})

export { startGameRegistry as registry, router }
export default router
