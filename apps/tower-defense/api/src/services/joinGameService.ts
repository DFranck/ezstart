// services/joinGameService.ts
import { logger } from '@ezstart/logger'
import { createDefaultGamePlayer } from '../lib/createDefaultGamePlayer.js'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { PlayerModel } from '../models/Player.js'
import { syncTickerWithDatabase } from '../tickers/tickerEngine.js'

export async function joinGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  const game = await GameModel.findById(gameId)
  if (!game) throw new Error('Game not found')
  if (game.phase !== 'waiting') throw new Error('Cannot join an active game')

  const player = await PlayerModel.findById(playerId)
  if (!player) throw new Error('Player not found')

  const alreadyJoined = game.players.some(p => p.toString() === playerId)
  if (alreadyJoined) {
    return {
      gameId,
      playerId,
      playerName: player.name,
      joinedAt: new Date().toISOString(),
      players: game.players,
    }
  }

  // Ajouter le joueur à la partie
  game.players.push(player._id)
  await game.save()

  // Créer l'entrée InGamePlayer
  await InGamePlayerModel.create({
    gameId: game._id,
    player: player._id,
    ...createDefaultGamePlayer({ playerId: player._id, name: player.name }),
  })

  // Synchroniser le ticker avec les données mises à jour
  await syncTickerWithDatabase(gameId)

  logger.debug(
    `[joinGameService] Player ${playerId} joined game ${gameId}. Total players: ${game.players.length}`
  )

  return {
    gameId: game._id.toString(),
    playerId: player._id.toString(),
    playerName: player.name,
    joinedAt: new Date().toISOString(),
    players: game.players,
  }
}
