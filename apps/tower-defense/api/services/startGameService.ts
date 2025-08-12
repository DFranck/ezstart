import { logger } from '@ezstart/ui/lib'
import { ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { mockShopItems } from '@tower-defense/types'
import { Types } from 'mongoose'
import { GameModel } from '../models/Game'
import { syncTickerWithDatabase } from '../tickers/tickerEngine'

// Map pour tracker les jeux en cours de démarrage (anti-race condition)
const startingGames = new Set<string>()

export async function startGameService({ gameId }: { gameId: string }) {
  // Vérifier si le jeu est déjà en cours de démarrage
  if (startingGames.has(gameId)) {
    throw new Error('Game is already starting')
  }

  // Ajouter le jeu à la liste des jeux en cours de démarrage
  startingGames.add(gameId)

  try {
    const game = await GameModel.findById(gameId)
    if (!game) throw new Error('Game not found')
    if (game.phase !== 'waiting') throw new Error('Game already started')

    // Vérifier qu'il y a au moins 2 joueurs
    const activePlayers = game.players.filter(p => p.status === 'active')
    if (activePlayers.length < 2) {
      throw new Error('Need at least 2 active players to start')
    }

    game.phase = 'playing'
    game.tick = 0

    game.set(
      'map',
      Array.from({ length: ZONE_HEIGHT }, () => Array(ZONE_WIDTH).fill('grass'))
    )

    game.set(
      'shop',
      (mockShopItems as any[]).map(item => ({
        ...item,
        tower: item.type === 'tower' ? { ...item.tower, _id: new Types.ObjectId() } : undefined,
        unit: item.type === 'unit' ? { ...item.unit, _id: new Types.ObjectId() } : undefined,
      }))
    )

    game.updatedAt = new Date()

    await game.save()

    // Synchroniser le ticker avec les données mises à jour
    await syncTickerWithDatabase(gameId)

    logger.debug(`[startGameService] Game ${gameId} started with ${activePlayers.length} active players`)

    return game
  } finally {
    // Toujours retirer le jeu de la liste des jeux en cours de démarrage
    startingGames.delete(gameId)
  }
}
