import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateQuery,
  Router,
} from '@ezstart/express-core'
import { z } from 'zod'
import { gameSchema, getGamesQuerySchema } from '@tower-defense/types'
import { getGamesController } from '../../controllers/getGamesController.js'

export const listGamesRegistry = new OpenAPIRegistry()
const router = Router()

const docRouter = createRouterWithDoc(listGamesRegistry, router)

docRouter.get('/', validateQuery(getGamesQuerySchema), getGamesController, {
  summary: 'List Games',
  tags: ['Games'],
  querySchema: getGamesQuerySchema,
  responseSchema: gameSchema.array(),
})

export { listGamesRegistry as registry, router }
export default router
