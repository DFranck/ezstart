import { generateMock } from '@anatine/zod-mock'
import { mongoIdSchema, z, type Infer } from '@ezstart/types'
import { EFFECTS, SHAPE_VALUES, TARGETING_STRATEGIES } from '@tower-defense/config'
import { damageTypeSchema } from './damage'
import { elementalTypeSchema } from './elements'
import { positionSchema } from './position'

export const towerSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().min(1).max(50).describe('Name of the tower'),
  elementalType: elementalTypeSchema.describe('Elemental type of tower'),
  position: positionSchema.describe('Tower position on the map'),
  damage: z.number().min(1).max(500).describe('Damage dealt by the tower'),
  damageType: damageTypeSchema.describe('Damage type of the tower'),
  speed: z.number().min(0.1).max(3).describe('Attack speed of the tower (attacks/sec)'),
  range: z.number().min(1).max(10).describe('Attack range of the tower'),
  shape: z
    .array(z.array(z.boolean()))
    .refine(
      shape => SHAPE_VALUES.some(allowed => JSON.stringify(allowed) === JSON.stringify(shape)),
      { message: 'Shape must match predefined Tetris shapes' }
    )
    .describe('2D shape of the tower (must match Tetris shape)'),
  splashRadius: z.number().min(0).max(5).optional().describe('Splash radius of the tower'),
  effect: z.enum(EFFECTS).optional().describe('Tower effect'),
  targetingStrategy: z.enum(TARGETING_STRATEGIES).optional().describe('Tower targeting strategy'),
  description: z.string().max(200).optional().describe('Description of the tower'),
})

export type Tower = Infer<typeof towerSchema>
export const mockTower = generateMock(towerSchema)
export const mockTowers = generateMock(z.array(towerSchema))
