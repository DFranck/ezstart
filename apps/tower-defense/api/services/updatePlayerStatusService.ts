import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { syncTickerWithDatabase } from '../tickers/tickerEngine.js'

export async function updatePlayerStatusService({
  gameId,
  playerId,
  status,
}: {
  gameId: string
  playerId: string
  status: 'active' | 'disconnected' | 'eliminated' | 'left'
}) {
  const game = await GameModel.findById(gameId)
  if (!game) {
    throw new Error('Game not found')
  }

  // Vérifier que le joueur est dans la partie
  const playerInGame = await InGamePlayerModel.findOne({ gameId, player: playerId })
  if (!playerInGame) {
    throw new Error('Player not found in game')
  }

  const previousStatus = playerInGame.status

  // Mettre à jour le statut dans InGamePlayer
  playerInGame.status = status
  await playerInGame.save()

  // Synchroniser le ticker avec les données mises à jour
  await syncTickerWithDatabase(gameId)

  logger.debug(
    `[updatePlayerStatusService] Player ${playerId} status changed from ${previousStatus} to ${status} in game ${gameId}`
  )

  return {
    gameId,
    playerId,
    previousStatus,
    newStatus: status,
    player: playerInGame,
  }
}
