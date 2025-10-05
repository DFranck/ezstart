/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║                      TIER UTILITY FUNCTIONS                        ║
 * ║                                                                    ║
 * ║  🎯 Helper functions for tier system enforcement                  ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

// Type definition to avoid circular dependency with @tower-defense/types
interface Tower {
  shape: boolean[][]
}

import {
  TIER_SYSTEM,
  TIER_UNLOCK_CONDITIONS,
  TOWER_TIER_RESTRICTIONS,
  TIER_INCOME_BONUS,
} from './tiers.js'

/**
 * Calculate the number of cells occupied by a tower shape
 */
export function getTowerShapeSize(shape: boolean[][]): number {
  return shape.reduce((count, row) => count + row.filter(cell => cell).length, 0)
}

/**
 * Check if a tower is allowed at a given tier
 */
export function isTowerAllowedAtTier(tower: Tower, tier: number, towerPrice: number): boolean {
  if (!TOWER_TIER_RESTRICTIONS.ENABLED) return true

  // Check shape size restriction
  const maxShapeSize = TOWER_TIER_RESTRICTIONS.MAX_SHAPE_SIZE_BY_TIER[tier as 1 | 2 | 3]
  if (maxShapeSize !== undefined) {
    const towerShapeSize = getTowerShapeSize(tower.shape)
    if (towerShapeSize > maxShapeSize) return false
  }

  // Check price restriction
  const maxPrice = TOWER_TIER_RESTRICTIONS.MAX_PRICE_BY_TIER[tier as 1 | 2 | 3]
  if (maxPrice !== undefined && towerPrice > maxPrice) return false

  return true
}

/**
 * Filter towers based on tier restrictions
 */
export function filterTowersByTier(
  towers: Tower[],
  tier: number,
  calculatePrice: (tower: Tower) => number
): Tower[] {
  if (!TIER_SYSTEM.ENABLED || !TOWER_TIER_RESTRICTIONS.ENABLED) return towers

  return towers.filter(tower => {
    const price = calculatePrice(tower)
    return isTowerAllowedAtTier(tower, tier, price)
  })
}

/**
 * Calculate required tier for a given gold spent amount
 */
export function getTierFromGoldSpent(goldSpent: number): number {
  if (!TIER_SYSTEM.ENABLED) return TIER_SYSTEM.MAX_TIER

  let currentTier = TIER_SYSTEM.STARTING_TIER

  // Check each tier unlock condition
  for (let tier = TIER_SYSTEM.STARTING_TIER + 1; tier <= TIER_SYSTEM.MAX_TIER; tier++) {
    const condition = TIER_UNLOCK_CONDITIONS[tier]
    if (!condition) continue

    if (condition.type === 'gold_spent' && goldSpent >= condition.value) {
      currentTier = tier
    }
    // Future: Add other condition types (kills, time, waves, manual)
  }

  return currentTier
}

/**
 * Get income bonus for a given tier
 */
export function getIncomeBonusForTier(tier: number): number {
  if (!TIER_INCOME_BONUS.ENABLED) return 0
  return TIER_INCOME_BONUS.BONUS_BY_TIER[tier as 1 | 2 | 3] ?? 0
}

/**
 * Calculate total income (base + tier bonus)
 */
export function calculateTotalIncome(baseIncome: number, tier: number): number {
  return baseIncome + getIncomeBonusForTier(tier)
}
