// services/joinGameService.ts
import { logger } from '@ezstart/ui/lib'
import { GameModel } from '../models/Game'
import { PlayerModel } from '../models/Player'

export async function joinGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  logger.debug('joinGameService', { gameId, playerId })
  const game = await GameModel.findById(gameId)
  if (!game) throw new Error('Game not found')
  if (game.phase !== 'waiting') throw new Error('Cannot join an active game')

  const player = await PlayerModel.findById(playerId)
  if (!player) throw new Error('Player not found')

  const alreadyJoined = game.players.some(p => p.toString() === playerId)
  if (alreadyJoined) return { gameId, playerId, joinedAt: new Date().toISOString() }

  game.players.push(player._id as any)
  await game.save()

  return {
    gameId: game._id.toString(),
    playerId: player._id.toString(),
    joinedAt: new Date().toISOString(),
  }
}
