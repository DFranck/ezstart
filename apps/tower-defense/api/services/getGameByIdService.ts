import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game'

export async function getGameByIdService(gameId: string) {
  logger.debug('getGameByIdService', gameId)
  const game = await GameModel.findById(gameId).populate('players.playerId').populate('host').exec()
  return game
}
