import { DEFAULT_PHASE } from '@tower-defense/config'
import { CreateGamePayload, CreateGameResponse } from '@tower-defense/types'
import { createDefaultGamePlayer } from '../lib/createDefaultGamePlayer.js'
import { GameModel } from '../models/Game.js'
import { PlayerModel } from '../models/Player.js'
export async function createGameService(input: CreateGamePayload): Promise<CreateGameResponse> {
  const player = await PlayerModel.findById(input.playerId)
  if (!player) {
    throw new Error('Player not found')
  }

  const newGame = await GameModel.create({
    phase: DEFAULT_PHASE,
    host: player._id,
    players: [createDefaultGamePlayer({ playerId: player._id, name: player.name })],
  })

  return {
    gameId: newGame._id.toString(),
  }
}
