import { generateMock } from '@anatine/zod-mock'
import { z } from 'zod'
import { mobSchema } from './mob.js'
import { towerSchema } from './tower.js'

export const priceModifierSchema = z.object({
  // Conditions (au moins une doit être définie)
  tier: z.number().min(1).optional().describe('Apply when player reaches this tier'),
  wave: z.number().min(1).optional().describe('Apply starting from this wave'),
  timeUnlock: z.number().min(0).optional().describe('Apply after X seconds of game time'),

  // Modificateurs (au moins un doit être défini)
  multiplier: z.number().positive().default(1).describe('Multiply base price'),
  discount: z.number().min(0).max(1).default(0).describe('Discount ratio (0.2 = 20% off)'),
  fixedPrice: z.number().min(1).optional().describe('Override base price completely'),
})

export type PriceModifier = z.infer<typeof priceModifierSchema>

export const shopItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tower'),
    basePrice: z.number().min(1).max(20).describe('Base price in gold (1-20 range)'),
    priceModifiers: z.array(priceModifierSchema).optional().describe('Dynamic price adjustments'),
    tower: towerSchema,
  }),
  z.object({
    type: z.literal('unit'),
    basePrice: z.number().min(1).max(15).describe('Base price in gold (1-15 range)'),
    priceModifiers: z.array(priceModifierSchema).optional().describe('Dynamic price adjustments'),
    unit: mobSchema,
  }),
])

export type ShopItem = z.infer<typeof shopItemSchema>

/**
 * Calculate current price based on game context
 * @param item Shop item
 * @param context Current game state
 * @returns Calculated price in gold
 */
export function getCurrentPrice(
  item: ShopItem,
  context: { tier: number; wave: number; gameTime: number }
): number {
  const { basePrice, priceModifiers } = item

  if (!priceModifiers?.length) return basePrice

  // Find applicable modifier (last matching one wins)
  const applicableModifiers = priceModifiers.filter(mod => {
    if (mod.tier && context.tier < mod.tier) return false
    if (mod.wave && context.wave < mod.wave) return false
    if (mod.timeUnlock && context.gameTime < mod.timeUnlock) return false
    return true
  })

  if (!applicableModifiers.length) return basePrice

  // Apply last matching modifier
  const modifier = applicableModifiers[applicableModifiers.length - 1]

  // Fixed price overrides everything
  if (modifier?.fixedPrice) return modifier.fixedPrice

  // Calculate with multiplier and discount
  const priceWithMultiplier = basePrice * (modifier?.multiplier ?? 1)
  return Math.round(priceWithMultiplier * (1 - (modifier?.discount ?? 0)))
}

export const mockShopItem = generateMock(shopItemSchema)
export const mockShopItems = generateMock(z.array(shopItemSchema))
