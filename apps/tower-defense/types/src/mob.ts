import { generateMock } from '@anatine/zod-mock'
import { z, type infer } from 'zod'
import { mongoIdSchema } from './common/mongo-id.js'
import { EFFECTS, ELEMENTAL_TYPES } from '@tower-defense/config'

export const mobSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().describe('Name of the mob'),
  elementalType: z.enum(ELEMENTAL_TYPES).describe('Type of mob'),
  hp: z.number().min(10).max(100).default(30).describe('Health points of the mob'),
  speed: z.number().min(1).max(10).default(5).describe('Speed of movement'),
  damage: z.number().min(1).max(3).default(1).describe('Damage dealt to player when reaching end'),
  effects: z.array(z.enum(EFFECTS)).optional(),
})

export type Mob = z.infer<typeof mobSchema>
export const mockMob = generateMock(mobSchema)
export const mockMobs = generateMock(z.array(mobSchema))
