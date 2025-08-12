import { createTickerEngine } from '@ezstart/api-core'
import type { Game } from '@tower-defense/types'

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  onTick: (gameId, state, tick) => {
    return { ...state, tick }
  },
})

// Fonction pour synchroniser l'état du ticker avec la base de données
export async function syncTickerWithDatabase(gameId: string) {
  const { GameModel } = await import('../models/Game')
  const game = await GameModel.findById(gameId)

  if (!game) {
    console.warn(`[ticker] Game ${gameId} not found in database`)
    return false
  }

  console.log(`[ticker] 🔄 Syncing ticker state with database for game ${gameId}`)
  console.log(`[ticker] Players in DB: ${game.players.length}`)

  // Convertir le document MongoDB en objet JavaScript simple et forcer le type
  const gameData = game.toObject() as any

  // Récupérer l'état actuel du ticker
  const currentTickerState = ticker.getState(gameId)
  const currentTick = currentTickerState?.tick || 0

  ticker.mutate(gameId, () => ({
    _id: gameData._id.toString(),
    players: gameData.players || [],
    map: gameData.map || [],
    shopTowers: gameData.shopTowers || [],
    shopUnits: gameData.shopUnits || [],
    tick: currentTick, // Garder le tick du ticker, pas celui de la DB
    host: gameData.host?.toString(),
    phase: gameData.phase || 'waiting',
    createdAt: gameData.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: gameData.updatedAt?.toISOString() || new Date().toISOString(),
  }))

  return true
}
