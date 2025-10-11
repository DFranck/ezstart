/**
 * Game Actions with Managers - Optimized version
 * Replaces tickerEngine with GameManager + EntityManager
 */

import { GameAction } from '@tower-defense/types'
import { gameManager } from '../managers/GameManager.js'
import { entityManager } from '../managers/EntityManager.js'
import { entityRegistry } from '../services/entityRegistry.js'

export async function handleGameActionWithManagers(gameId: string, action: GameAction) {
  const game = gameManager.getGame(gameId)
  if (!game) {
    return { success: false, reason: 'Game not found' }
  }

  switch (action.type) {
    case 'placeTower': {
      const { x, y, towerType, playerId } = action.payload

      try {
        // Create tower using EntityManager (uses EntityRegistry for type lookup)
        const tower = entityManager.createTower(towerType._id, playerId, { x, y })

        // Place tower in GameManager
        gameManager.placeTower(gameId, tower)

        console.log(
          `[placeTower] ✅ Placed tower ${tower.typeId} at (${x}, ${y}) for player ${playerId}`
        )
        return { success: true }
      } catch (error) {
        console.error('[placeTower] Error:', error)
        return { success: false, reason: 'Failed to place tower' }
      }
    }

    case 'takeDamage': {
      const { playerId, damage } = action.payload

      try {
        const player = game.players.get(playerId)
        if (!player) {
          return { success: false, reason: 'Player not found' }
        }

        // Apply damage
        gameManager.updatePlayer(gameId, playerId, {
          hp: player.hp - damage,
          isAlive: player.hp - damage > 0,
        })

        return { success: true }
      } catch (error) {
        console.error('[takeDamage] Error:', error)
        return { success: false, reason: 'Failed to apply damage' }
      }
    }

    case 'spawnMob': {
      const { mobType, targetPlayerId, fromPlayerId } = action.payload

      try {
        // Create mob using EntityManager
        const mob = entityManager.createMob(
          mobType._id,
          targetPlayerId,
          { x: 0, y: 0 }, // Start position (path[0])
          0 // pathIndex
        )

        // Spawn in GameManager
        gameManager.spawnMob(gameId, mob)

        return { success: true }
      } catch (error) {
        console.error('[spawnMob] Error:', error)
        return { success: false, reason: 'Failed to spawn mob' }
      }
    }

    default:
      return { success: false, reason: 'Unknown action type' }
  }
}
