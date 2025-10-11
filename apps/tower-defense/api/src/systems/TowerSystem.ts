/**
 * TowerSystem - Tower targeting and combat logic
 */

import { GameInstance } from '../managers/GameManager.js'
import { entityRegistry } from '../services/entityRegistry.js'
import { gameManager } from '../managers/GameManager.js'
import { distance } from '../engine/SpatialGrid.js'
import { getIO } from '../socketInstance.js'

export class TowerSystem {
  static update(game: GameInstance): void {
    game.towers.forEach(tower => {
      const towerType = entityRegistry.getTowerType(tower.towerTypeId)
      if (!towerType) return

      // Get nearby mobs using SpatialGrid (O(1))
      const nearbyMobs = game.mobs.getNearby(tower.origin, towerType.range)

      // Filter by exact range
      const mobsInRange = nearbyMobs.filter(mob => distance(mob.position, tower.origin) <= towerType.range)

      if (mobsInRange.length === 0) return

      // Target first mob (or use targeting strategy)
      const target = mobsInRange[0]
      if (!target) return

      // Deal damage
      target.currentHp -= towerType.damage

      // Emit projectile event for client animation
      const io = getIO()
      io.to(`game-${game.id}`).emit('projectile', {
        from: tower.origin,
        to: target.position,
        damage: towerType.damage,
        targetMobId: target.id,
      })

      // Update mob HP
      gameManager.updateMob(game.id, target)

      // Remove if dead
      if (target.currentHp <= 0) {
        gameManager.removeMob(game.id, target.id)
      }
    })
  }
}
