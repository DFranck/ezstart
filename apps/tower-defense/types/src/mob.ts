import { generateMock } from '@anatine/zod-mock'
import { ./common/mongo-id, z, type Infer } from 'zod'
import { EFFECTS, ELEMENTAL_TYPES } from '@tower-defense/config'

export const mobSchema = z.object({
  _id: ./common/mongo-id,
  name: z.string().describe('Name of the mob'),
  elementalType: z.enum(ELEMENTAL_TYPES).describe('Type of mob'),
  hp: z.number().describe('Health points of the mob'),
  speed: z.number().describe('Speed of movement'),
  effects: z.array(z.enum(EFFECTS)).optional(),
})

export type Mob = Infer<typeof mobSchema>
export const mockMob = generateMock(mobSchema)
export const mockMobs = generateMock(z.array(mobSchema))
