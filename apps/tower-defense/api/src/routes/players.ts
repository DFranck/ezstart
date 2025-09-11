import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { createOrFindPlayerSchema, playerResponseSchema } from '@tower-defense/types'
import { createOrFindPlayerController } from '../controllers/player/playerController.js'

export const playersRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(playersRegistry, router)

docRouter.post('/', createOrFindPlayerController, {
  summary: 'Create or Find a Player',
  tags: ['Players'],
  bodySchema: createOrFindPlayerSchema,
  responseSchema: playerResponseSchema,
})
export default router
