import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  validateQuery,
} from '@ezstart/express-core'
import { ./common/mongo-id, z } from 'zod'

const paramsMongoIdSchema = z.object({
  id: ./common/mongo-id
})
import {
  createGameResponseSchema,
  gameSchema,
  getGamesQuerySchema,
  joinGameResponseSchema,
} from '@tower-defense/types'
import express from 'express'
import { createGameController } from '../controllers/createGameController.js'
import { getGameByIdController } from '../controllers/getGameByIdController.js'
import { getGamesController } from '../controllers/getGamesController.js'
import { joinGameController } from '../controllers/joinGameController.js'
import { leaveGameController } from '../controllers/leaveGameController.js'
import { startGameController } from '../controllers/startGameController.js'

export const gamesRegistry = new OpenAPIRegistry()
const router = express.Router()

const docRouter = createRouterWithDoc(gamesRegistry, router)

docRouter.get('/', validateQuery(getGamesQuerySchema), getGamesController, {
  summary: 'List Games',
  tags: ['Games'],
  querySchema: getGamesQuerySchema,
  responseSchema: gameSchema.array(),
})
docRouter.post('/', createGameController, {
  summary: 'Create a Game',
  tags: ['Games'],
  responseSchema: createGameResponseSchema,
})

docRouter.get('/:id', validateParams(paramsMongoIdSchema), getGameByIdController, {
  summary: 'Get a Game',
  tags: ['Games'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: gameSchema,
})
docRouter.post('/:id/start', validateParams(paramsMongoIdSchema), startGameController, {
  summary: 'Start a Game',
  tags: ['Games'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: gameSchema,
})
docRouter.post('/:id/join', validateParams(paramsMongoIdSchema), joinGameController, {
  summary: 'Join a Game',
  tags: ['Games'],
  bodySchema: ./common/mongo-id,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: joinGameResponseSchema,
})
docRouter.post('/:id/leave', validateParams(paramsMongoIdSchema), leaveGameController, {
  summary: 'Leave a Game',
  tags: ['Games'],
  paramsSchema: paramsMongoIdSchema,
})

export default router
