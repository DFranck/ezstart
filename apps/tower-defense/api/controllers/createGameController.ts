import { makeCreateController } from '@ezstart/api-core'
import { createGameSchema } from '@tower-defense/types'
import { createGameService } from '../services/createGameService'

export const createGameController = makeCreateController(
  createGameSchema,
  createGameService,
  'games:create'
)
