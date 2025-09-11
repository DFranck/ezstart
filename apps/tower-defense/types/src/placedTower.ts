import { z, type infer } from 'zod'
import { positionSchema } from './position.js'
import { towerSchema } from './tower.js'

export const placedTowerSchema = towerSchema.extend({
  origin: positionSchema,
  coveredCells: z.array(positionSchema),
})

export type PlacedTower = z.infer<typeof placedTowerSchema>
