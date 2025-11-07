import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import { createGameResponseSchema } from '@tower-defense/types'
import { createGameController } from '../../controllers/createGameController.js'

export const createGameRegistry = new OpenAPIRegistry()
const router = Router()

const docRouter = createRouterWithDoc(createGameRegistry, router)

docRouter.post('/', createGameController, {
  summary: 'Create a Game',
  tags: ['Games'],
  responseSchema: createGameResponseSchema,
})

export { createGameRegistry as registry, router }
export default router
