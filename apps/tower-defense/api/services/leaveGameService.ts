import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game'
import { checkEndGame } from '../utils/checkEndGame';
import { getIO } from '../socketInstance';
import { syncTickerWithDatabase } from '../tickers/tickerEngine'

export async function leaveGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  const game = await GameModel.findById(gameId)
  if (!game) throw new Error('Game not found')

  const index = game.players.findIndex(p => p.playerId.toString() === playerId)

  if (index === -1) return { gameId, left: false }

  const isLobby = game.phase === 'waiting'

  if (isLobby) {
    game.players.splice(index, 1)

    if (game.players.length === 0) {
      await game.deleteOne()
      logger.debug('Game deleted because it had no more players', { gameId })
      return {
        gameId,
        deleted: true,
        leftAt: new Date().toISOString(),
      }
    }
  } else {
    const player = game.players[index]
    if (!player) return { gameId, left: false }

    player.status = 'left'
    checkEndGame(gameId)
    getIO().to(gameId).emit('gameState', game)
  }

  await game.save()

  // Synchroniser le ticker avec les données mises à jour
  await syncTickerWithDatabase(gameId)
  
  logger.debug(`[leaveGameService] Player ${playerId} left game ${gameId}. Remaining players: ${game.players.length}`)

  return {
    gameId,
    leftAt: new Date().toISOString(),
    status: isLobby ? 'removed' : 'left',
  }
}
