import { describe, it, expect, beforeAll } from 'vitest'
import { entityManager } from '../../managers/EntityManager.js'
import { seedEntityTypes } from '../../services/entityRegistry.js'
import type { ActiveMob, PlacedTower } from '@tower-defense/types'

describe('EntityManager', () => {
  const testPlayerId = 'player-123'
  const testMobTypeId = 'mob-basic-slime'
  const testTowerTypeId = 'tower-basic-archer'

  beforeAll(async () => {
    // Seed entity types before running tests
    await seedEntityTypes()
  })

  describe('createMob', () => {
    it('should create a mob with valid mobTypeId', () => {
      const position = { x: 0, y: 0 }
      const mob = entityManager.createMob(testMobTypeId, testPlayerId, position)

      expect(mob).toBeDefined()
      expect(mob.id).toBeDefined()
      expect(mob.mobTypeId).toBe(testMobTypeId)
      expect(mob.targetPlayerId).toBe(testPlayerId)
      expect(mob.position).toEqual(position)
      expect(mob.pathIndex).toBe(0)
      expect(mob.currentHp).toBeGreaterThan(0)
    })

    it('should create mob with custom pathIndex', () => {
      const position = { x: 5, y: 10 }
      const pathIndex = 3
      const mob = entityManager.createMob(testMobTypeId, testPlayerId, position, pathIndex)

      expect(mob.pathIndex).toBe(pathIndex)
    })

    it('should create mob with currentHp equal to mobType.hp', () => {
      const position = { x: 0, y: 0 }
      const mob = entityManager.createMob(testMobTypeId, testPlayerId, position)

      // Basic slime has 30 HP
      expect(mob.currentHp).toBe(30)
    })

    it('should throw error for invalid mobTypeId', () => {
      const position = { x: 0, y: 0 }

      expect(() => {
        entityManager.createMob('invalid-mob-id', testPlayerId, position)
      }).toThrow('MobType invalid-mob-id not found in registry')
    })

    it('should generate unique IDs for each mob', () => {
      const position = { x: 0, y: 0 }
      const mob1 = entityManager.createMob(testMobTypeId, testPlayerId, position)
      const mob2 = entityManager.createMob(testMobTypeId, testPlayerId, position)

      expect(mob1.id).not.toBe(mob2.id)
    })

    it('should create mob with correct position', () => {
      const position = { x: 15, y: 25 }
      const mob = entityManager.createMob(testMobTypeId, testPlayerId, position)

      expect(mob.position.x).toBe(15)
      expect(mob.position.y).toBe(25)
    })
  })

  describe('createTower', () => {
    it('should create a tower with valid towerTypeId', () => {
      const origin = { x: 5, y: 5 }
      const coveredCells = [origin]
      const tower = entityManager.createTower(testTowerTypeId, testPlayerId, origin, coveredCells)

      expect(tower).toBeDefined()
      expect(tower.id).toBeDefined()
      expect(tower.towerTypeId).toBe(testTowerTypeId)
      expect(tower.playerId).toBe(testPlayerId)
      expect(tower.origin).toEqual(origin)
      expect(tower.coveredCells).toEqual(coveredCells)
    })

    it('should create tower with multiple covered cells', () => {
      const origin = { x: 10, y: 10 }
      const coveredCells = [
        { x: 10, y: 10 },
        { x: 11, y: 10 },
        { x: 10, y: 11 },
        { x: 11, y: 11 },
      ]
      const tower = entityManager.createTower(testTowerTypeId, testPlayerId, origin, coveredCells)

      expect(tower.coveredCells).toHaveLength(4)
      expect(tower.coveredCells).toEqual(coveredCells)
    })

    it('should throw error for invalid towerTypeId', () => {
      const origin = { x: 5, y: 5 }
      const coveredCells = [origin]

      expect(() => {
        entityManager.createTower('invalid-tower-id', testPlayerId, origin, coveredCells)
      }).toThrow('TowerType invalid-tower-id not found in registry')
    })

    it('should generate unique IDs for each tower', () => {
      const origin = { x: 5, y: 5 }
      const coveredCells = [origin]
      const tower1 = entityManager.createTower(testTowerTypeId, testPlayerId, origin, coveredCells)
      const tower2 = entityManager.createTower(testTowerTypeId, testPlayerId, origin, coveredCells)

      expect(tower1.id).not.toBe(tower2.id)
    })

    it('should create tower with correct origin', () => {
      const origin = { x: 20, y: 30 }
      const coveredCells = [origin]
      const tower = entityManager.createTower(testTowerTypeId, testPlayerId, origin, coveredCells)

      expect(tower.origin.x).toBe(20)
      expect(tower.origin.y).toBe(30)
    })
  })

  describe('validateMobType', () => {
    it('should return true for valid mobTypeId', () => {
      const isValid = entityManager.validateMobType(testMobTypeId)

      expect(isValid).toBe(true)
    })

    it('should return false for invalid mobTypeId', () => {
      const isValid = entityManager.validateMobType('invalid-mob-id')

      expect(isValid).toBe(false)
    })

    it('should return true for all seeded mob types', () => {
      const mobTypes = [
        'mob-basic-slime',
        'mob-armored-knight',
        'mob-flying-bat',
        'mob-fire-imp',
        'mob-water-sprite',
      ]

      mobTypes.forEach(mobTypeId => {
        expect(entityManager.validateMobType(mobTypeId)).toBe(true)
      })
    })
  })

  describe('validateTowerType', () => {
    it('should return true for valid towerTypeId', () => {
      const isValid = entityManager.validateTowerType(testTowerTypeId)

      expect(isValid).toBe(true)
    })

    it('should return false for invalid towerTypeId', () => {
      const isValid = entityManager.validateTowerType('invalid-tower-id')

      expect(isValid).toBe(false)
    })

    it('should return true for all seeded tower types', () => {
      const towerTypes = [
        'tower-basic-archer',
        'tower-sniper',
        'tower-cannon',
        'tower-fire-basic',
        'tower-water-basic',
      ]

      towerTypes.forEach(towerTypeId => {
        expect(entityManager.validateTowerType(towerTypeId)).toBe(true)
      })
    })
  })

  describe('Integration - Mob and Tower creation', () => {
    it('should create mob and tower for same player', () => {
      const mobPosition = { x: 0, y: 0 }
      const towerOrigin = { x: 10, y: 10 }
      const coveredCells = [towerOrigin]

      const mob = entityManager.createMob(testMobTypeId, testPlayerId, mobPosition)
      const tower = entityManager.createTower(testTowerTypeId, testPlayerId, towerOrigin, coveredCells)

      expect(mob.targetPlayerId).toBe(testPlayerId)
      expect(tower.playerId).toBe(testPlayerId)
    })

    it('should create multiple entities without conflicts', () => {
      const entities: Array<ActiveMob | PlacedTower> = []

      // Create 5 mobs
      for (let i = 0; i < 5; i++) {
        const mob = entityManager.createMob(testMobTypeId, testPlayerId, { x: i, y: 0 })
        entities.push(mob)
      }

      // Create 5 towers
      for (let i = 0; i < 5; i++) {
        const tower = entityManager.createTower(testTowerTypeId, testPlayerId, { x: i, y: 10 }, [{ x: i, y: 10 }])
        entities.push(tower)
      }

      // All IDs should be unique
      const ids = entities.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(10)
    })
  })
})
