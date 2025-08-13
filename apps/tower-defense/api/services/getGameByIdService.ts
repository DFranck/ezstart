import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game.js'

export async function getGameByIdService(gameId: string) {
 
  const game = await GameModel.findById(gameId).populate('players.playerId').populate('host').exec()
  return game
}
