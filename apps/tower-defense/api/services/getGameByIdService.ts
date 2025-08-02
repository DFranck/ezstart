import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game'

export async function getGameByIdService(gameId: string) {
  logger.debug('getGameByIdService', gameId)
  const game = await GameModel.findById(gameId)
  return game
}
