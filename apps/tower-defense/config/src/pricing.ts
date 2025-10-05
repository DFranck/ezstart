/**
 * Pricing configuration for towers and units
 * Used by both frontend (shop display) and backend (purchase validation)
 *
 * ⚠️ NE PAS MODIFIER ICI - Tout est contrôlé par balance.ts
 */

import { TOWER_PRICING, DEBUG } from './balance.js'

/**
 * Calculate tower price based on complexity
 * More damage/range/effects = higher price
 */
export function calculateTowerPrice(tower: {
  damage: number
  range: number
  speed: number
  splashRadius?: number
  effect?: string
}): number {
  let price = TOWER_PRICING.BASE

  // Damage contribution
  price += Math.floor((tower.damage - 1) * TOWER_PRICING.DAMAGE_MULTIPLIER)

  // Range contribution
  price += Math.floor((tower.range - 3) * TOWER_PRICING.RANGE_MULTIPLIER)

  // Speed contribution
  price += Math.floor((tower.speed - 1) * TOWER_PRICING.SPEED_MULTIPLIER)

  // Splash bonus
  if (tower.splashRadius && tower.splashRadius > 0) {
    price += TOWER_PRICING.SPLASH_BONUS
  }

  // Effect bonus
  if (tower.effect) {
    price += TOWER_PRICING.EFFECT_BONUS
  }

  // Cap between min/max
  const finalPrice = Math.min(TOWER_PRICING.MAX, Math.max(TOWER_PRICING.MIN, price))

  if (DEBUG.ENABLE_PRICING_LOGS) {
    console.log(`[Price] Tower (dmg:${tower.damage} rng:${tower.range} spd:${tower.speed}) → ${finalPrice}g`)
  }

  return finalPrice
}

import { UNIT_PRICING } from './balance.js'

/**
 * Calculate unit price based on stats
 * More HP/damage/speed = higher price
 */
export function calculateUnitPrice(unit: {
  hp: number
  damage: number
  speed: number
  attackRange: number
  canFly?: boolean
}): number {
  let price = UNIT_PRICING.BASE

  // HP contribution
  price += Math.floor((unit.hp - 10) * UNIT_PRICING.HP_MULTIPLIER)

  // Damage contribution
  price += Math.floor((unit.damage - 1) * UNIT_PRICING.DAMAGE_MULTIPLIER)

  // Speed contribution
  price += Math.floor((unit.speed - 1) * UNIT_PRICING.SPEED_MULTIPLIER)

  // Ranged bonus
  if (unit.attackRange > 0) {
    price += UNIT_PRICING.RANGED_BONUS
  }

  // Flying bonus
  if (unit.canFly) {
    price += UNIT_PRICING.FLY_BONUS
  }

  // Cap between min/max
  const finalPrice = Math.min(UNIT_PRICING.MAX, Math.max(UNIT_PRICING.MIN, price))

  if (DEBUG.ENABLE_PRICING_LOGS) {
    console.log(`[Price] Unit (hp:${unit.hp} dmg:${unit.damage} spd:${unit.speed}) → ${finalPrice}g`)
  }

  return finalPrice
}

import { STARTING_GOLD, BASE_INCOME, INCOME_INTERVAL_SECONDS, KILL_REWARDS, INCOME_INCREASE } from './balance.js'

/**
 * Re-export balance values for compatibility
 */
export { STARTING_GOLD, BASE_INCOME as STARTING_INCOME, INCOME_INCREASE }

/**
 * Calculate gold reward for killing a mob
 */
export function calculateKillReward(mob: {
  hp: number
  damage: number
  speed: number
  canFly?: boolean
}): number {
  let reward = KILL_REWARDS.BASE

  // HP contribution
  reward += Math.floor((mob.hp - 10) * KILL_REWARDS.HP_MULTIPLIER)

  // Damage contribution
  reward += Math.floor((mob.damage - 1) * KILL_REWARDS.DAMAGE_MULTIPLIER)

  // Speed contribution
  reward += Math.floor((mob.speed - 1) * KILL_REWARDS.SPEED_MULTIPLIER)

  // Flying bonus
  if (mob.canFly) {
    reward += KILL_REWARDS.FLY_BONUS
  }

  // Cap between min/max
  const finalReward = Math.min(KILL_REWARDS.MAX, Math.max(KILL_REWARDS.MIN, reward))

  if (DEBUG.ENABLE_KILL_REWARD_LOGS) {
    console.log(`[Reward] Mob killed (hp:${mob.hp} dmg:${mob.damage} spd:${mob.speed}) → +${finalReward}g`)
  }

  return finalReward
}

/**
 * Get income tick interval in ticks (based on TICK_INTERVAL_MS from balance)
 * @param tickIntervalMs Ticker interval in milliseconds
 */
export function getIncomeTickInterval(tickIntervalMs: number = 250): number {
  return Math.floor((INCOME_INTERVAL_SECONDS * 1000) / tickIntervalMs)
}
