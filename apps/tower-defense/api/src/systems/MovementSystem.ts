/**
 * MovementSystem - Mob movement and pathfinding logic
 */

import { GameInstance } from '../managers/GameManager.js'
import { entityRegistry } from '../services/entityRegistry.js'
import { gameManager } from '../managers/GameManager.js'

export class MovementSystem {
  static update(game: GameInstance): void {
    const mobsToRemove: string[] = []

    game.mobs.forEach(mob => {
      const mobType = entityRegistry.getMobType(mob.mobTypeId)
      if (!mobType) {
        mobsToRemove.push(mob.id)
        return
      }

      // Simple movement: move towards target (simplified pathfinding)
      const speed = mobType.speed / 10 // tiles per tick

      // For now, just move straight (you can add pathfinding later)
      mob.position.x += speed

      // Check if reached end (x > 20 for example)
      if (mob.position.x >= 20) {
        mobsToRemove.push(mob.id)

        // Damage player
        const player = game.players.get(mob.targetPlayerId)
        if (player) {
          player.hp -= mobType.damage
          if (player.hp <= 0) {
            player.isAlive = false
          }
        }
      } else {
        // Update mob in spatial grid
        gameManager.updateMob(game.id, mob)
      }
    })

    // Remove dead mobs
    mobsToRemove.forEach(id => gameManager.removeMob(game.id, id))
  }
}
