import { logger } from '@ezstart/ui/lib'
import { ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { mockShopItems } from '@tower-defense/types'
import { Types } from 'mongoose'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { syncTickerWithDatabase } from '../tickers/tickerEngine.js'
import { getGameTicker } from '../tickers/getGameTicker.js'
import { getIO } from '../socketInstance.js'

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

    // Vérifier qu'il y a au moins 2 joueurs actifs via InGamePlayer
    const inGamePlayers = await InGamePlayerModel.find({ gameId }).populate('player')
    const activePlayers = inGamePlayers.filter(p => p.status === 'active')
    if (activePlayers.length < 2) {
      throw new Error('Need at least 2 active players to start')
    }

    game.phase = 'playing'
    game.tick = 0
    game.startedAt = new Date()

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

    // Démarrer le ticker pour ce jeu
    const { ticker } = await import('../tickers/tickerEngine.js')
    ticker.ensureRoom(gameId)

    // Obtenir l'état initial du jeu depuis le ticker
    const gameTicker = getGameTicker(gameId)
    const initialGameState = gameTicker?.getState()

    if (initialGameState) {
      logger.debug(`[startGameService] Broadcasting initial game state to room: ${gameId}`)
      // Broadcaster l'état initial à tous les joueurs qui rejoignent le jeu
      getIO().to(gameId).emit('gameState', initialGameState)
      
      // Notifier les joueurs dans le lobby que le jeu a commencé
      getIO().to(`lobby:${gameId}`).emit('lobby:gameStarted', {
        gameId,
        phase: 'playing'
      })

      // Émettre un événement global pour mettre à jour la home page
      getIO().emit('gameStarted', {
        gameId,
        game: await GameModel.findById(gameId).populate('players host')
      })
    }

    logger.debug(`[startGameService] Game ${gameId} started with ${activePlayers.length} active players`)
    logger.debug(`[startGameService] Active players:`, activePlayers.map(p => ({
      id: p._id,
      name: typeof p.player === 'object' ? p.player.name : p.player,
      status: p.status
    })))

    return { game, activePlayers }
  } finally {
    // Toujours retirer le jeu de la liste des jeux en cours de démarrage
    startingGames.delete(gameId)
  }
}
