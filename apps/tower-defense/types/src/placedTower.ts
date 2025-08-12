import { z, type Infer } from '@ezstart/types'
import { positionSchema } from './position.js'
import { towerSchema } from './tower.js'

export const placedTowerSchema = towerSchema.extend({
  origin: positionSchema,
  coveredCells: z.array(positionSchema),
})

export type PlacedTower = Infer<typeof placedTowerSchema>
