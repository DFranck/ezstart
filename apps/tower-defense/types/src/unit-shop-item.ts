import { generateMock } from '@anatine/zod-mock'
import { z, type Infer } from '@ezstart/types'
import { mobSchema } from './mob.js'

export const unitShopItemSchema = z.object({
  price: z.number(),
  unit: mobSchema,
})

export type UnitShopItem = Infer<typeof unitShopItemSchema>
export const mockUnitShopItem = () => generateMock(unitShopItemSchema)
