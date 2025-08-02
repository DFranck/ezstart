import { logger } from '@ezstart/ui/lib'
import { CreateGamePayload, CreateGameResponse } from '@tower-defense/types'
import { GameModel } from '../models/Game'

export async function createGameService(input: CreateGamePayload): Promise<CreateGameResponse> {
  logger.debug('createGameService', input)
  const game = await GameModel.create({
    playerName: input.playerName,
  })

  return {
    gameId: game._id.toString(),
  }
}
