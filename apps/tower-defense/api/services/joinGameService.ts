// services/joinGameService.ts
import { logger } from '@ezstart/ui/lib'
import { createDefaultGamePlayer } from '../lib/createDefaultGamePlayer'
import { GameModel } from '../models/Game'
import { PlayerModel } from '../models/Player'
import { syncTickerWithDatabase } from '../tickers/tickerEngine'

export async function joinGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  const game = await GameModel.findById(gameId)
  if (!game) throw new Error('Game not found')
  if (game.phase !== 'waiting') throw new Error('Cannot join an active game')

  const player = await PlayerModel.findById(playerId)
  if (!player) throw new Error('Player not found')

  const alreadyJoined = game.players.some(p => p.toString() === playerId)
  if (alreadyJoined) return { gameId, playerId, joinedAt: new Date().toISOString() }

  game.players.push(createDefaultGamePlayer({ playerId: player._id, name: player.name }))
  await game.save()

  // Synchroniser le ticker avec les données mises à jour
  await syncTickerWithDatabase(gameId)

  logger.debug(
    `[joinGameService] Player ${playerId} joined game ${gameId}. Total players: ${game.players.length}`
  )

  return {
    gameId: game._id.toString(),
    playerId: player._id.toString(),
    joinedAt: new Date().toISOString(),
    players: game.players,
  }
}
