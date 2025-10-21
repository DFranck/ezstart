import { logger } from '@ezstart/logger'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { getIO } from '../socketInstance.js'
import { syncTickerWithDatabase } from '../tickers/tickerEngine.js'
import { checkEndGame } from '../utils/checkEndGame.js'
import { updatePlayerStatusService } from './updatePlayerStatusService.js'

export async function leaveGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  const game = await GameModel.findById(gameId)
  if (!game) throw new Error('Game not found')

  const playerIndex = game.players.findIndex(p => p.toString() === playerId)
  if (playerIndex === -1) return { gameId, left: false }

  const isLobby = game.phase === 'waiting'

  if (isLobby) {
    // En lobby : supprimer le joueur
    game.players.splice(playerIndex, 1)

    // Supprimer aussi l'entrée InGamePlayer
    await InGamePlayerModel.deleteOne({ gameId, player: playerId })

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
    // En jeu : marquer comme 'left' au lieu de supprimer
    await updatePlayerStatusService({ gameId, playerId, status: 'left' })
  }

  await game.save()

  // Synchroniser le ticker avec les données mises à jour
  await syncTickerWithDatabase(gameId)

  // Check end game AFTER ticker sync to ensure accurate player counts
  if (!isLobby) {
    checkEndGame(gameId)
    getIO().to(gameId).emit('gameState', game)
  }

  logger.debug(
    `[leaveGameService] Player ${playerId} left game ${gameId}. Remaining players: ${game.players.length}`
  )

  return {
    gameId,
    leftAt: new Date().toISOString(),
    status: isLobby ? 'removed' : 'left',
    players: game.players, // Retourner la liste des joueurs restants
  }
}
