import { makeCreateController } from '@ezstart/express-core'
import { createGameSchema } from '@tower-defense/types'
import { createGameService } from '../services/createGameService.js'

export const createGameController = makeCreateController(
  createGameSchema,
  createGameService,
  'games:create'
)
