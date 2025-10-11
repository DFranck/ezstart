/**
 * EntityManager - Factory for creating game entities
 *
 * Creates ActiveMob and PlacedTower instances with proper type references.
 * All entities use optimized format (mobTypeId/towerTypeId) for bandwidth reduction.
 */

import { ActiveMob, PlacedTower, Position } from '@tower-defense/types'
import { entityRegistry } from '../services/entityRegistry.js'
import { ObjectId } from 'mongodb'

class EntityManager {
  /**
   * Create a new ActiveMob instance
   * Time: O(1)
   */
  createMob(
    mobTypeId: string,
    targetPlayerId: string,
    position: Position,
    pathIndex: number = 0
  ): ActiveMob {
    const mobType = entityRegistry.getMobType(mobTypeId)
    if (!mobType) {
      throw new Error(`MobType ${mobTypeId} not found in registry`)
    }

    const mob: ActiveMob = {
      id: new ObjectId().toString(),
      mobTypeId,
      currentHp: mobType.hp,
      position,
      pathIndex,
      targetPlayerId,
    }

    return mob
  }

  /**
   * Create a new PlacedTower instance
   * Time: O(1)
   */
  createTower(
    towerTypeId: string,
    origin: Position,
    coveredCells: Position[]
  ): PlacedTower {
    const towerType = entityRegistry.getTowerType(towerTypeId)
    if (!towerType) {
      throw new Error(`TowerType ${towerTypeId} not found in registry`)
    }

    const tower: PlacedTower = {
      id: new ObjectId().toString(),
      towerTypeId,
      origin,
      coveredCells,
    }

    return tower
  }

  /**
   * Validate mob type exists
   */
  validateMobType(mobTypeId: string): boolean {
    return entityRegistry.getMobType(mobTypeId) !== undefined
  }

  /**
   * Validate tower type exists
   */
  validateTowerType(towerTypeId: string): boolean {
    return entityRegistry.getTowerType(towerTypeId) !== undefined
  }
}

// Singleton instance
export const entityManager = new EntityManager()
