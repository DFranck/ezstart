import { Tower } from '@tower-defense/types'
import { canPlaceTowerAt, placeTower } from '../services/gameActions/placeTower.js'
import { ticker } from './tickerEngine.js'

export function getGameTicker(gameId: string) {
  const state = ticker.getState(gameId)
  if (!state) return null

  return {
    getState: () => ticker.getState(gameId),
    placeTower: async (playerId: string, x: number, y: number, tower: Tower) =>
      await placeTower(gameId, playerId, x, y, tower),
    canPlaceTowerAt: (playerId: string, x: number, y: number, tower: Tower) =>
      canPlaceTowerAt(gameId, playerId, x, y, tower),
  }
}
