import { GameAction } from '@tower-defense/types'
import { spawnMob } from '../services/gameActions/spawnMob.js'
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
      console.log('[placeTower] Attempt:', { playerId, x, y, towerType })

      const isValid = ticker.canPlaceTowerAt(playerId, x, y, towerType)
      console.log('[placeTower] Validation result:', isValid)

      if (!isValid) {
        const state = ticker.getState(gameId)
        console.warn('[placeTower] REJECTED - Invalid placement:', {
          playerId,
          x,
          y,
          towerType,
          gameState: state ? {
            phase: state.phase,
            playerExists: !!state.players.find(p =>
              (typeof p.player === 'string' ? p.player : p.player?._id) === playerId
            ),
            mapSize: state.map.length
          } : 'No ticker state'
        })
        return { success: false, reason: 'Invalid tower placement' }
      }

      await ticker.placeTower(playerId, x, y, towerType)
      console.log('[placeTower] SUCCESS - Tower placed at', { x, y, towerType })
      return { success: true }
    }

    case 'takeDamage': {
      const result = takeDamage(gameId, action.payload)
      return result
    }

    case 'spawnMob': {
      const { mobType, targetPlayerId, fromPlayerId } = action.payload
      spawnMob(gameId, mobType, targetPlayerId, fromPlayerId)
      return { success: true }
    }

    default:
      return { success: false, reason: 'Unknown action type' }
  }
}
