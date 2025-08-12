import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game'
import { syncTickerWithDatabase } from '../tickers/tickerEngine'

export async function updatePlayerStatusService({ 
  gameId, 
  playerId, 
  status 
}: { 
  gameId: string
  playerId: string
  status: 'active' | 'disconnected' | 'eliminated' | 'left'
}) {
  const game = await GameModel.findById(gameId)
  if (!game) {
    throw new Error('Game not found')
  }

  const playerIndex = game.players.findIndex(p => p.playerId.toString() === playerId)
  if (playerIndex === -1) {
    throw new Error('Player not found in game')
  }

  const player = game.players[playerIndex]
  if (!player) {
    throw new Error('Player not found in game')
  }

  const previousStatus = player.status
  
  // Mettre à jour le statut
  player.status = status
  game.players[playerIndex] = player

  // Sauvegarder les changements
  await game.save()

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
    player: player
  }
}