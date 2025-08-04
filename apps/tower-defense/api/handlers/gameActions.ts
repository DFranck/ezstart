import { GameAction } from '@tower-defense/types'
import { getGameTicker } from '../tickers/getGameTicker'

export function handleGameAction(gameId: string, action: GameAction) {
  const ticker = getGameTicker(gameId)
  if (!ticker) return { success: false, reason: 'Game not found' }

  switch (action.type) {
    case 'placeTower': {
      const { x, y, towerType, playerId } = action.payload

      const isValid = ticker.canPlaceTowerAt(playerId, x, y, towerType)
      if (!isValid) return { success: false, reason: 'Invalid tower placement' }

      ticker.placeTower(playerId, x, y, towerType)
      return { success: true }
    }

    default:
      return { success: false, reason: 'Unknown action type' }
  }
}
