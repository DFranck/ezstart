/**
 * Entity Helpers - Backward compatibility layer
 *
 * Provides helper functions to work with both legacy (embedded objects)
 * and optimized (reference IDs) entity structures.
 */

import { ActiveMob, ActiveMobLegacy, PlacedTower, PlacedTowerLegacy, MobType, TowerType, Mob, Tower } from '@tower-defense/types'
import { entityRegistry } from './entityRegistry.js'
import { ObjectId } from 'mongodb'

/**
 * Get MobType from ActiveMob (supports both old and new format)
 */
export function getMobTypeFromActive(activeMob: ActiveMob | ActiveMobLegacy): MobType {
  // New format: use mobTypeId
  if ('mobTypeId' in activeMob && activeMob.mobTypeId) {
    const mobType = entityRegistry.getMobType(activeMob.mobTypeId)
    if (!mobType) {
      throw new Error(`MobType ${activeMob.mobTypeId} not found in registry`)
    }
    return mobType
  }

  // Legacy format: embedded mob object
  if ('mob' in activeMob && activeMob.mob) {
    return activeMob.mob as MobType
  }

  throw new Error('ActiveMob has neither mobTypeId nor mob property')
}

/**
 * Get TowerType from PlacedTower (supports both old and new format)
 */
export function getTowerTypeFromPlaced(placedTower: PlacedTower | PlacedTowerLegacy): TowerType {
  // New format: use towerTypeId
  if ('towerTypeId' in placedTower && placedTower.towerTypeId) {
    const towerType = entityRegistry.getTowerType(placedTower.towerTypeId)
    if (!towerType) {
      throw new Error(`TowerType ${placedTower.towerTypeId} not found in registry`)
    }
    return towerType
  }

  // Legacy format: embedded properties (PlacedTower extends Tower)
  // Extract Tower properties
  const towerType: TowerType = {
    _id: (placedTower as any)._id || new ObjectId().toString(),
    name: (placedTower as any).name || 'Unknown',
    elementalType: (placedTower as any).elementalType,
    damage: (placedTower as any).damage || 2,
    damageType: (placedTower as any).damageType || 'physical',
    speed: (placedTower as any).speed || 1,
    range: (placedTower as any).range || 5,
    shape: (placedTower as any).shape || [[true]],
    splashRadius: (placedTower as any).splashRadius,
    effect: (placedTower as any).effect,
    targetingStrategy: (placedTower as any).targetingStrategy,
    description: (placedTower as any).description,
  }

  return towerType
}

/**
 * Convert legacy Mob to MobType (register if not exists)
 */
export function mobToMobType(mob: Mob): MobType {
  // Check if already registered
  const existing = entityRegistry.getMobType(mob._id)
  if (existing) return existing

  // Register new type
  const mobType: MobType = {
    _id: mob._id,
    name: mob.name,
    elementalType: mob.elementalType,
    hp: mob.hp,
    speed: mob.speed,
    damage: mob.damage,
    effects: mob.effects,
    canFly: mob.canFly,
    attackRange: mob.attackRange,
    collisionRadius: mob.collisionRadius,
  }

  entityRegistry.registerMobType(mobType)
  return mobType
}

/**
 * Convert legacy Tower to TowerType (register if not exists)
 */
export function towerToTowerType(tower: Tower): TowerType {
  // Check if already registered
  const existing = entityRegistry.getTowerType(tower._id)
  if (existing) return existing

  // Register new type
  const towerType: TowerType = {
    _id: tower._id,
    name: tower.name,
    elementalType: tower.elementalType,
    damage: tower.damage,
    damageType: tower.damageType,
    speed: tower.speed,
    range: tower.range,
    shape: tower.shape,
    splashRadius: tower.splashRadius,
    effect: tower.effect,
    targetingStrategy: tower.targetingStrategy,
    description: tower.description,
  }

  entityRegistry.registerTowerType(towerType)
  return towerType
}

/**
 * Create ActiveMob from Mob (auto-converts to new format)
 */
export function createActiveMob(
  mobOrId: Mob | string,
  targetPlayerId: string,
  position: { x: number; y: number },
  pathIndex: number = 0
): ActiveMob {
  let mobTypeId: string

  if (typeof mobOrId === 'string') {
    // Already have ID
    mobTypeId = mobOrId
  } else {
    // Convert Mob to MobType and get ID
    const mobType = mobToMobType(mobOrId)
    mobTypeId = mobType._id
  }

  const mobType = entityRegistry.getMobType(mobTypeId)!

  return {
    id: new ObjectId().toString(),
    mobTypeId,
    currentHp: mobType.hp,
    position,
    pathIndex,
    targetPlayerId,
  }
}

/**
 * Create PlacedTower from Tower (auto-converts to new format)
 */
export function createPlacedTower(
  towerOrId: Tower | string,
  origin: { x: number; y: number },
  coveredCells: Array<{ x: number; y: number }>
): PlacedTower {
  let towerTypeId: string

  if (typeof towerOrId === 'string') {
    // Already have ID
    towerTypeId = towerOrId
  } else {
    // Convert Tower to TowerType and get ID
    const towerType = towerToTowerType(towerOrId)
    towerTypeId = towerType._id
  }

  return {
    id: new ObjectId().toString(),
    towerTypeId,
    origin,
    coveredCells,
  }
}
