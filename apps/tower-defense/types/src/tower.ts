// path: @tower-defense/types/src/tower.ts
import { generateMock } from '@anatine/zod-mock'
import { z, type Infer } from 'zod'
import { EFFECTS, SHAPE_VALUES, TARGETING_STRATEGIES } from '@tower-defense/config'
import { damageTypeSchema } from './damage.js'
import { elementalTypeSchema } from './elements.js'

type BoolGrid = boolean[][]

export const towerSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(50).describe('Name of the tower'),
  elementalType: z
    .union([
      elementalTypeSchema, // mono-type
      z
        .tuple([elementalTypeSchema, elementalTypeSchema])
        .refine(([a, b]) => a !== b, { message: 'Dual type must contain two different types' }),
    ])
    .describe('Elemental type of the tower'),
  damage: z.number().min(1).max(500).describe('Damage dealt by the tower'),
  damageType: damageTypeSchema.describe('Damage type of the tower'),
  speed: z.number().min(0.1).max(3).describe('Attack speed of the tower (attacks/sec)'),
  range: z.number().min(1).max(10).describe('Attack range of the tower'),
  shape: z
    .array(z.array(z.boolean()))
    .refine(
      (shape: BoolGrid) =>
        SHAPE_VALUES.some(
          (allowed: readonly (readonly boolean[])[]) =>
            JSON.stringify(allowed) === JSON.stringify(shape)
        ),
      { message: 'Shape must match predefined Tetris shapes' }
    )
    .describe('2D shape of the tower (must match Tetris shape)'),
  splashRadius: z.number().min(0).max(5).optional().describe('Splash radius of the tower'),
  effect: z.enum(EFFECTS).optional().describe('Tower effect'),
  targetingStrategy: z.enum(TARGETING_STRATEGIES).optional().describe('Tower targeting strategy'),
  description: z.string().max(200).optional().describe('Description of the tower'),
})

export type Tower = Infer<typeof towerSchema>

function getRandomShape(): boolean[][] {
  const shape = SHAPE_VALUES[Math.floor(Math.random() * SHAPE_VALUES.length)]
  return JSON.parse(JSON.stringify(shape)) as boolean[][]
}

export function mockTowers(count: number): Tower[] {
  return Array.from({ length: count }, () => ({
    ...generateMock(towerSchema),
    shape: getRandomShape(),
  }))
}

export const mockTower: Tower = {
  ...generateMock(towerSchema),
  shape: getRandomShape(),
}
