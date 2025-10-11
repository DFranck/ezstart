/**
 * EntityRegistry - In-memory registry for MobType and TowerType definitions
 *
 * Provides O(1) lookup for entity types by ID.
 * Types are loaded once at server startup and cached in memory.
 */

import type { MobType, TowerType } from '@tower-defense/types'
import { ENTITY_MOB_TYPES, ENTITY_TOWER_TYPES } from '@tower-defense/types'

class EntityRegistry {
  private mobTypes = new Map<string, MobType>()
  private towerTypes = new Map<string, TowerType>()

  // Mob Type Registry
  registerMobType(mobType: MobType): void {
    this.mobTypes.set(mobType._id, mobType)
  }

  getMobType(id: string): MobType | undefined {
    return this.mobTypes.get(id)
  }

  getAllMobTypes(): MobType[] {
    return Array.from(this.mobTypes.values())
  }

  clearMobTypes(): void {
    this.mobTypes.clear()
  }

  // Tower Type Registry
  registerTowerType(towerType: TowerType): void {
    this.towerTypes.set(towerType._id, towerType)
  }

  getTowerType(id: string): TowerType | undefined {
    return this.towerTypes.get(id)
  }

  getAllTowerTypes(): TowerType[] {
    return Array.from(this.towerTypes.values())
  }

  clearTowerTypes(): void {
    this.towerTypes.clear()
  }

  // Stats
  getStats() {
    return {
      mobTypes: this.mobTypes.size,
      towerTypes: this.towerTypes.size,
    }
  }

  // Clear all
  clear(): void {
    this.mobTypes.clear()
    this.towerTypes.clear()
  }
}

// Singleton instance
export const entityRegistry = new EntityRegistry()

/**
 * Seed entity types from shared @tower-defense/config
 * Called at server startup
 *
 * This ensures API and Web use the EXACT same entity definitions (type safety!)
 */
export async function seedEntityTypes(): Promise<void> {
  console.log('🌱 Seeding entity types from @tower-defense/config...')

  // Import shared entity definitions from config package
  ENTITY_MOB_TYPES.forEach(mobType => {
    entityRegistry.registerMobType(mobType)
  })

  ENTITY_TOWER_TYPES.forEach(towerType => {
    entityRegistry.registerTowerType(towerType)
  })

  const stats = entityRegistry.getStats()
  console.log(`✅ Seeded ${stats.mobTypes} mob types and ${stats.towerTypes} tower types`)
}
