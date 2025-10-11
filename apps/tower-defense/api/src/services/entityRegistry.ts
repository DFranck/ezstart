/**
 * EntityRegistry - In-memory registry for MobType and TowerType definitions
 *
 * Provides O(1) lookup for entity types by ID.
 * Types are loaded once at server startup and cached in memory.
 */

import { MobType, TowerType } from '@tower-defense/types'

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
 * Seed entity types from existing mob/tower configurations
 * Called at server startup
 */
export async function seedEntityTypes(): Promise<void> {
  console.log('🌱 Seeding entity types...')

  // For now, we'll convert existing Mob and Tower objects to types
  // In the future, these could come from a database or config files

  // Example: Create some basic mob types
  const basicMobTypes: MobType[] = [
    {
      _id: 'mob-basic-normal',
      name: 'Basic Slime',
      elementalType: 'normal',
      hp: 30,
      speed: 5,
      damage: 1,
      canFly: false,
      attackRange: 0,
      collisionRadius: 0.3,
    },
    {
      _id: 'mob-fire',
      name: 'Fire Elemental',
      elementalType: 'fire',
      hp: 25,
      speed: 6,
      damage: 2,
      canFly: false,
      attackRange: 0,
      collisionRadius: 0.3,
    },
    {
      _id: 'mob-water',
      name: 'Water Spirit',
      elementalType: 'water',
      hp: 35,
      speed: 4,
      damage: 1,
      canFly: false,
      attackRange: 0,
      collisionRadius: 0.3,
    },
  ]

  basicMobTypes.forEach(mobType => {
    entityRegistry.registerMobType(mobType)
  })

  // Example: Create some basic tower types
  const basicTowerTypes: TowerType[] = [
    {
      _id: 'tower-basic-normal',
      name: 'Basic Tower',
      elementalType: 'normal',
      damage: 2,
      damageType: 'physical',
      speed: 1,
      range: 5,
      shape: [[true]],
    },
    {
      _id: 'tower-fire',
      name: 'Fire Tower',
      elementalType: 'fire',
      damage: 3,
      damageType: 'magical',
      speed: 1,
      range: 6,
      shape: [[true]],
    },
    {
      _id: 'tower-water',
      name: 'Water Tower',
      elementalType: 'water',
      damage: 2,
      damageType: 'magical',
      speed: 2,
      range: 5,
      shape: [[true]],
    },
  ]

  basicTowerTypes.forEach(towerType => {
    entityRegistry.registerTowerType(towerType)
  })

  const stats = entityRegistry.getStats()
  console.log(`✅ Seeded ${stats.mobTypes} mob types and ${stats.towerTypes} tower types`)
}
