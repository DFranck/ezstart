import { z, type Infer } from '@ezstart/types'
import { positionSchema } from './position'
import { towerSchema } from './tower'

export const placedTowerSchema = towerSchema.extend({
  origin: positionSchema,
  coveredCells: z.array(positionSchema),
})

export type PlacedTower = Infer<typeof placedTowerSchema>
