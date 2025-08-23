import { createTickerEngine } from '@ezstart/api-core'
import type { Game } from '@tower-defense/types'
import { checkPlayerEliminationService } from '../services/checkPlayerEliminationService.js'

export const ticker = createTickerEngine<Game>({
  createInitialState: gameId => ({
    _id: gameId,
    players: [],
    map: [],
    shopTowers: [],
    shopUnits: [],
    tick: 0,
    host: undefined,
    phase: 'waiting',
    startedAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  onTick: async (gameId, state, tick) => {
    // Vérifier les éliminations à chaque tick
    await checkPlayerEliminationService(gameId)
    
    return { ...state, tick }
  },
})

// Fonction pour synchroniser l'état du ticker avec la base de données
export async function syncTickerWithDatabase(gameId: string) {
  const { GameModel } = await import('../models/Game')
  const { InGamePlayerModel } = await import('../models/InGamePlayer')
  
  const game = await GameModel.findById(gameId)
  if (!game) {
    console.warn(`[ticker] Game ${gameId} not found in database`)
    return false
  }

  // Récupérer les InGamePlayers avec les données complètes
  const inGamePlayers = await InGamePlayerModel.find({ gameId }).populate('player').exec()
  
  console.log(`[ticker] 🔄 Syncing ticker state with database for game ${gameId}`)
  console.log(`[ticker] InGamePlayers in DB: ${inGamePlayers.length}`)
  console.log(`[ticker] Active players:`, inGamePlayers.filter(p => p.status === 'active').length)

  // Convertir le document MongoDB en objet JavaScript simple
  const gameData = game.toObject() as any

  // Récupérer l'état actuel du ticker
  const currentTickerState = ticker.getState(gameId)
  const currentTick = currentTickerState?.tick || 0

  ticker.mutate(gameId, () => ({
    _id: gameData._id.toString(),
    players: inGamePlayers, // Utiliser les InGamePlayers au lieu des Player references
    map: gameData.map || [],
    shopTowers: gameData.shopTowers || [],
    shopUnits: gameData.shopUnits || [],
    tick: currentTick, // Garder le tick du ticker, pas celui de la DB
    host: gameData.host?.toString(),
    phase: gameData.phase || 'waiting',
    startedAt: gameData.startedAt?.toISOString(),
    createdAt: gameData.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: gameData.updatedAt?.toISOString() || new Date().toISOString(),
  }))

  console.log(`[ticker] ✅ Ticker synchronized for game ${gameId} with ${inGamePlayers.length} players`)
  return true
}
