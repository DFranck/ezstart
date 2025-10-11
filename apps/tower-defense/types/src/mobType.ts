/**
 * MobType - Static mob definition (loaded once, referenced by ID)
 *
 * Replaces embedded Mob objects in ActiveMob to reduce data duplication.
 * All static properties that never change during runtime.
 */

import { generateMock } from '@anatine/zod-mock'
import { z } from 'zod'
import { mongoIdSchema } from './common/mongo-id.js'
import { EFFECTS, ELEMENTAL_TYPES } from '@tower-defense/config'

export const mobTypeSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().describe('Name of the mob'),
  elementalType: z.enum(ELEMENTAL_TYPES).describe('Type of mob'),
  hp: z.number().min(10).max(100).default(30).describe('Base health points'),
  speed: z.number().min(1).max(10).default(5).describe('Speed of movement'),
  damage: z.number().min(1).max(3).default(1).describe('Damage dealt to player'),
  effects: z.array(z.enum(EFFECTS)).optional().describe('Special effects'),
  canFly: z.boolean().default(false).describe('Ignores collisions if true'),
  attackRange: z.number().min(0).max(10).default(0).describe('Attack range (0 = melee)'),
  collisionRadius: z.number().min(0.1).max(1).default(0.3).describe('Collision radius in tiles'),
})

export type MobType = z.infer<typeof mobTypeSchema>

export const mockMobType = generateMock(mobTypeSchema)
export const mockMobTypes = (count: number = 5) =>
  Array.from({ length: count }, () => generateMock(mobTypeSchema))
