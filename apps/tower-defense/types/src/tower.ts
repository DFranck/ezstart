// path: @tower-defense/types/src/tower.ts
import { generateMock } from '@anatine/zod-mock'
import { z, type infer } from 'zod'
import { EFFECTS, SHAPE_VALUES, getShapesByMaxSize, TARGETING_STRATEGIES } from '@tower-defense/config'
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
  damage: z.number().min(1).max(5).default(2).describe('Damage dealt by the tower'),
  damageType: damageTypeSchema.describe('Damage type of the tower'),
  speed: z.number().min(1).max(5).default(1).describe('Attack speed of the tower (attacks per tick)'),
  range: z.number().min(3).max(10).default(5).describe('Attack range of the tower'),
  shape: z
    .array(z.array(z.boolean()))
    .refine(
      (shape: BoolGrid) => {
        // Max 3×3, connected cells, at least 1 cell
        const rows = shape.length
        if (rows === 0 || rows > 3) return false
        const cols = shape[0]?.length ?? 0
        if (cols === 0 || cols > 3) return false

        // Check rectangular
        for (const row of shape) {
          if (row.length !== cols) return false
        }

        // Must have at least one true
        if (!shape.some(row => row.some(cell => cell))) return false

        return true
      },
      { message: 'Shape must be max 3×3 with connected cells' }
    )
    .describe('2D shape of the tower (max 3×3, connected cells)'),
  splashRadius: z.number().min(0).max(5).optional().describe('Splash radius of the tower'),
  effect: z.enum(EFFECTS).optional().describe('Tower effect'),
  targetingStrategy: z.enum(TARGETING_STRATEGIES).optional().describe('Tower targeting strategy'),
  description: z.string().max(200).optional().describe('Description of the tower'),
})

export type Tower = z.infer<typeof towerSchema>

function getRandomShape(maxCells?: number): boolean[][] {
  const availableShapes = maxCells ? getShapesByMaxSize(maxCells) : SHAPE_VALUES
  const shape = availableShapes[Math.floor(Math.random() * availableShapes.length)]
  if (!shape) {
    // Fallback to single cell if no shape found
    return [[true]]
  }
  // Deep clone to avoid readonly issues
  return shape.map(row => [...row])
}

export function mockTowers(count: number, filterFn?: (tower: Tower) => boolean, maxCells?: number): Tower[] {
  const maxAttempts = count * 10 // Prevent infinite loop
  const towers: Tower[] = []
  let attempts = 0

  while (towers.length < count && attempts < maxAttempts) {
    const tower: Tower = {
      ...generateMock(towerSchema),
      shape: getRandomShape(maxCells),
    }

    // If no filter or filter passes, add the tower
    if (!filterFn || filterFn(tower)) {
      towers.push(tower)
    }

    attempts++
  }

  return towers
}

export const mockTower: Tower = {
  ...generateMock(towerSchema),
  shape: getRandomShape(),
}
