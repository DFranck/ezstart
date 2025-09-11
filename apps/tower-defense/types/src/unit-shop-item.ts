import { generateMock } from '@anatine/zod-mock'
import { z, type infer } from 'zod'
import { mobSchema } from './mob.js'

export const unitShopItemSchema = z.object({
  price: z.number(),
  unit: mobSchema,
})

export type UnitShopItem = z.infer<typeof unitShopItemSchema>
export const mockUnitShopItem = () => generateMock(unitShopItemSchema)
