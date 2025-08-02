import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game'

export async function leaveGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  logger.debug('leaveGameService', { gameId, playerId })
  const game = await GameModel.findById(gameId)
  if (!game) throw new Error('Game not found')
  if (game.phase !== 'waiting') throw new Error('Cannot leave an active game')

  game.players.pull(playerId)
  await game.save()

  return {
    gameId: game._id.toString(),
    leftAt: new Date().toISOString(),
  }
}
