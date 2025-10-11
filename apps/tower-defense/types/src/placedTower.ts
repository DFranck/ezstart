import { z, type infer } from 'zod'
import { mongoIdSchema } from './common/mongo-id.js'
import { positionSchema } from './position.js'
import { towerSchema } from './tower.js'

/**
 * PlacedTower - Runtime state for a placed tower instance
 *
 * OPTIMIZED: Uses towerTypeId reference instead of embedding full Tower object.
 * Reduces size from ~390 bytes to ~90 bytes (77% smaller).
 */
export const placedTowerSchema = z.object({
  id: mongoIdSchema.describe('Unique ID for this placed tower instance'),
  towerTypeId: mongoIdSchema.describe('Reference to TowerType definition'),
  origin: positionSchema.describe('Origin position of the tower'),
  coveredCells: z.array(positionSchema).describe('Cells covered by tower shape'),
})

export type PlacedTower = z.infer<typeof placedTowerSchema>

// Legacy schema for backward compatibility during migration
export const placedTowerLegacySchema = towerSchema.extend({
  origin: positionSchema,
  coveredCells: z.array(positionSchema),
})

export type PlacedTowerLegacy = z.infer<typeof placedTowerLegacySchema>
