import { createRouterWithDoc, OpenAPIRegistry } from '@ezstart/api-core'
import { createOrFindPlayerSchema, playerResponseSchema } from '@tower-defense/types'
import express from 'express'
import { createOrFindPlayerController } from '../controllers/player/playerController'

export const playersRegistry = new OpenAPIRegistry()
const router = express.Router()
const docRouter = createRouterWithDoc(playersRegistry, router)

docRouter.post('/', createOrFindPlayerController, {
  summary: 'Create or Find a Player',
  tags: ['Players'],
  bodySchema: createOrFindPlayerSchema,
  responseSchema: playerResponseSchema,
})
export default router
