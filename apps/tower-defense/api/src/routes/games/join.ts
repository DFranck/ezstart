import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
} from '@ezstart/express-core'
import { z } from 'zod'
import {
  joinGameResponseSchema,
  mongoIdSchema,
  paramsMongoIdSchema,
} from '@tower-defense/types'
import { joinGameController } from '../../controllers/joinGameController.js'

export const joinGameRegistry = new OpenAPIRegistry()
const router = Router()

const docRouter = createRouterWithDoc(joinGameRegistry, router)

docRouter.post('/:id/join', validateParams(paramsMongoIdSchema), joinGameController, {
  summary: 'Join a Game',
  tags: ['Games'],
  bodySchema: z.object({ playerId: mongoIdSchema.describe('Player ID to join the game') }),
  paramsSchema: paramsMongoIdSchema,
  responseSchema: joinGameResponseSchema,
})

export { joinGameRegistry as registry, router }
export default router
