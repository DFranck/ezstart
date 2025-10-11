/**
 * TowerType - Static tower definition (loaded once, referenced by ID)
 *
 * Replaces embedded Tower objects in PlacedTower to reduce data duplication.
 * All static properties that never change during runtime.
 */

import { generateMock } from '@anatine/zod-mock'
import { z } from 'zod'
import { mongoIdSchema } from './common/mongo-id.js'
import { EFFECTS, TARGETING_STRATEGIES } from '@tower-defense/config'
import { damageTypeSchema } from './damage.js'
import { elementalTypeSchema } from './elements.js'

export const towerTypeSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().min(1).max(50).describe('Name of the tower'),
  elementalType: z
    .union([
      elementalTypeSchema, // mono-type
      z
        .tuple([elementalTypeSchema, elementalTypeSchema])
        .refine(([a, b]) => a !== b, { message: 'Dual type must contain two different types' }),
    ])
    .describe('Elemental type of the tower'),
  damage: z.number().min(1).max(5).default(2).describe('Damage dealt by the tower'),
  damageType: damageTypeSchema.describe('Damage type of the tower'),
  speed: z.number().min(1).max(5).default(1).describe('Attack speed (attacks per tick)'),
  range: z.number().min(3).max(10).default(5).describe('Attack range'),
  shape: z
    .array(z.array(z.boolean()))
    .describe('2D shape of the tower (max 3×3, connected cells)'),
  splashRadius: z.number().min(0).max(5).optional().describe('Splash radius'),
  effect: z.enum(EFFECTS).optional().describe('Tower effect'),
  targetingStrategy: z.enum(TARGETING_STRATEGIES).optional().describe('Targeting strategy'),
  description: z.string().max(200).optional().describe('Description'),
})

export type TowerType = z.infer<typeof towerTypeSchema>

export const mockTowerType = generateMock(towerTypeSchema)
export const mockTowerTypes = (count: number = 5) =>
  Array.from({ length: count }, () => generateMock(towerTypeSchema))
