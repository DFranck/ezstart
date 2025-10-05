import { generateMock } from '@anatine/zod-mock'
import { z } from 'zod'
import { mobSchema } from './mob.js'
import { priceModifierSchema } from './shop-item.js'

export const unitShopItemSchema = z.object({
  basePrice: z.number().min(1).max(3).describe('Base price in gold (1-15 range)'),
  priceModifiers: z.array(priceModifierSchema).optional().describe('Dynamic price adjustments'),
  unit: mobSchema,
})

export type UnitShopItem = z.infer<typeof unitShopItemSchema>
export const mockUnitShopItem = () => generateMock(unitShopItemSchema)
