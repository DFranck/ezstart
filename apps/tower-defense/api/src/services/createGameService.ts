import { DEFAULT_PHASE, DEFAULT_HP, DEFAULT_GOLD, DEFAULT_INCOME } from '@tower-defense/config'
import { CreateGamePayload, CreateGameResponse } from '@tower-defense/types'
import { createDefaultGamePlayer } from '../lib/createDefaultGamePlayer.js'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { PlayerModel } from '../models/Player.js'
import { getIO } from '../socketInstance.js'
import { gameManager } from '../managers/GameManager.js'

export async function createGameService(input: CreateGamePayload): Promise<CreateGameResponse> {
  const player = await PlayerModel.findById(input.playerId)
  if (!player) {
    throw new Error('Player not found')
  }

  const newGame = await GameModel.create({
    phase: DEFAULT_PHASE,
    host: player._id,
    players: [player._id],
  })

  // Créer l'InGamePlayer pour le host
  await InGamePlayerModel.create({
    gameId: newGame._id,
    player: player._id,
    ...createDefaultGamePlayer({ playerId: player._id, name: player.name }),
  })

  // NEW: Create game in GameManager (in-memory) with SAME ID as DB
  const gameId = newGame._id.toString()
  gameManager.createGame(player._id.toString(), gameId) // Pass DB gameId!

  // Add host as first player
  gameManager.addPlayer(gameId, {
    id: player._id.toString(),
    name: player.name,
    hp: DEFAULT_HP,
    gold: DEFAULT_GOLD,
    income: DEFAULT_INCOME,
    tier: 1,
    goldSpent: 0,
    isAlive: true,
  })

  console.log(`[createGameService] ✅ Created game ${gameId} in both DB and GameManager`)

  // Émettre l'événement de création de game
  const populatedGame = await GameModel.findById(newGame._id).populate('players host')
  getIO().emit('gameCreated', populatedGame)

  return {
    gameId: newGame._id.toString(),
  }
}
