import { Tower } from '@tower-defense/types'
import { canPlaceTowerAt, placeTower } from '../services/gameActions/placeTower'
import { ticker } from './tickerEngine'

export function getGameTicker(gameId: string) {
  const state = ticker.getState(gameId)
  if (!state) return null

  return {
    getState: () => ticker.getState(gameId),
    placeTower: (playerId: string, x: number, y: number, tower: Tower) =>
      placeTower(gameId, playerId, x, y, tower),
    canPlaceTowerAt: (playerId: string, x: number, y: number, tower: Tower) =>
      canPlaceTowerAt(gameId, playerId, x, y, tower),
  }
}
