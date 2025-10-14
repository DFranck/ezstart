/**
 * Game Actions with Managers - Optimized version
 * Replaces tickerEngine with GameManager + EntityManager
 */

import { GameAction } from '@tower-defense/types'
import { gameManager } from '../managers/GameManager.js'
import { entityManager } from '../managers/EntityManager.js'
import { entityRegistry } from '../services/entityRegistry.js'
import { computeCoveredCells } from '@tower-defense/utils'
import { InGamePlayerModel } from '../models/InGamePlayer.js'

export async function handleGameActionWithManagers(gameId: string, action: GameAction) {
  const game = gameManager.getGame(gameId)
  if (!game) {
    return { success: false, reason: 'Game not found' }
  }

  switch (action.type) {
    case 'placeTower': {
      const { x, y, towerType, playerId } = action.payload

      try {
        // Compute covered cells based on tower dimensions
        const origin = { x, y }
        const coveredCells = computeCoveredCells(x, y, towerType)

        // Create tower using EntityManager (uses EntityRegistry for type lookup)
        const tower = entityManager.createTower(towerType._id, playerId, origin, coveredCells)

        // Place tower in GameManager (in-memory state)
        gameManager.placeTower(gameId, tower)

        // CRITICAL: Also update InGamePlayer in database for persistence
        await InGamePlayerModel.findOneAndUpdate(
          { gameId, player: playerId },
          { $push: { placedTowers: tower } }
        )

        console.log(
          `[placeTower] ✅ Placed tower ${tower.towerTypeId} at (${x}, ${y}) for player ${playerId}`
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
        // Get target player to access their towers and compute path
        const targetPlayer = game.players.get(targetPlayerId)
        if (!targetPlayer) {
          return { success: false, reason: 'Target player not found' }
        }

        // Get all towers for the target player from GameManager
        const playerTowers = game.towers.getAll().filter(t => {
          // Towers don't have playerId in current implementation
          // We need to match based on the game state
          // For now, use starting position from path
          return true
        })

        // Compute path based on player's placed towers
        const { findPath } = await import('@tower-defense/utils')
        const coveredCells = playerTowers.flatMap(t => t.coveredCells)
        const path = findPath(coveredCells)

        if (path.length === 0) {
          return { success: false, reason: 'No valid path for mob' }
        }

        // Start position is the first cell in the path
        const startPosition = path[0]
        if (!startPosition) {
          return { success: false, reason: 'No valid start position in path' }
        }

        // Create mob using EntityManager
        const mob = entityManager.createMob(
          mobType._id,
          targetPlayerId,
          startPosition,
          0 // pathIndex
        )

        // Spawn in GameManager
        gameManager.spawnMob(gameId, mob)

        console.log(
          `[spawnMob] ✅ Spawned mob ${mobType.name} targeting ${targetPlayerId} at (${startPosition.x}, ${startPosition.y})`
        )
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
