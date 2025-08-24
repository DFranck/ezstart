import { GameAction } from '@tower-defense/types'
import { takeDamage } from '../services/gameActions/takeDamage.js'
import { getGameTicker } from '../tickers/getGameTicker.js'

export async function handleGameAction(gameId: string, action: GameAction) {
  const ticker = getGameTicker(gameId)
  if (!ticker) {
    return { success: false, reason: 'Game not found' }
  }

  switch (action.type) {
    case 'placeTower': {
      const { x, y, towerType, playerId } = action.payload

      const isValid = ticker.canPlaceTowerAt(playerId, x, y, towerType)
      if (!isValid) {
        return { success: false, reason: 'Invalid tower placement' }
      }

      await ticker.placeTower(playerId, x, y, towerType)
      return { success: true }
    }

    case 'takeDamage': {
      const result = takeDamage(gameId, action.payload)
      return result
    }

    default:
      console.log(`[handleGameAction] ❓ Unknown action type: ${action.type}`)
      return { success: false, reason: 'Unknown action type' }
  }
}
