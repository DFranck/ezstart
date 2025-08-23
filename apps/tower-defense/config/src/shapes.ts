// path: @tower-defense/config/src/shapes.ts
/**
 * Tetromino shapes for tower placement.
 * Boolean grids: `true` = occupied cell, `false` = empty.
 * Non-empty, rectangular grids enforced at type-level + runtime.
 */

export type Cell = boolean
export type NonEmptyRow = readonly [Cell, ...Cell[]]
export type NonEmptyGrid = readonly [NonEmptyRow, ...NonEmptyRow[]]
export type Grid = NonEmptyGrid
export type Orientation = 0 | 90 | 180 | 270

export const TETROMINO_KEYS = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'] as const
export type ShapeKey = (typeof TETROMINO_KEYS)[number]

/** Base (canonical) orientation for each tetromino. */
export const BASE_TOWER_SHAPES: Readonly<Record<ShapeKey, NonEmptyGrid>> = {
  I: [[true], [true], [true], [true]],
  O: [
    [true, true],
    [true, true],
  ],
  T: [
    [true, true, true],
    [false, true, false],
  ],
  L: [
    [true, false],
    [true, false],
    [true, true],
  ],
  J: [
    [false, true],
    [false, true],
    [true, true],
  ],
  S: [
    [false, true, true],
    [true, true, false],
  ],
  Z: [
    [true, true, false],
    [false, true, true],
  ],
} as const

/** Runtime validator: non-empty & rectangular. */
function isNonEmptyRectangular(g: readonly (readonly Cell[])[]): g is NonEmptyGrid {
  if (g.length === 0) return false
  const first = g[0]
  if (!first || first.length === 0) return false
  const cols = first.length
  for (let r = 0; r < g.length; r++) {
    const row = g[r]
    if (!row || row.length !== cols) return false
  }
  return true
}

/** Convert a mutable boolean[][] into a validated NonEmptyGrid. */
function toNonEmptyGrid(g: boolean[][]): NonEmptyGrid {
  if (!isNonEmptyRectangular(g)) {
    throw new Error('Grid must be non-empty and rectangular')
  }
  // Narrow OK after runtime check
  return g as unknown as NonEmptyGrid
}

/** Rotate a grid 90° clockwise — safe (no possibly-undefined). */
export function rotateCW(g: Grid): Grid {
  const rows = g.length // >= 1
  const cols = g[0].length // >= 1

  // IMPORTANT: on initialise chaque cellule à false pour éviter "undefined"
  const out: boolean[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => false)
  )

  // forEach typed: "row" ne peut pas être undefined ici
  g.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      // TS ne relie pas toujours row.length === cols, on aide le checker:
      const value: boolean = (row as readonly boolean[])[c] as boolean
      // idem pour out[c], on sait qu'il existe: c < cols
      out[c]![rows - 1 - r] = value
    }
  })

  return toNonEmptyGrid(out)
}

/** Build the 4 standard orientations. */
function buildRotations4(base: Grid): readonly [Grid, Grid, Grid, Grid] {
  const r0 = base
  const r90 = rotateCW(r0)
  const r180 = rotateCW(r90)
  const r270 = rotateCW(r180)
  return [r0, r90, r180, r270] as const
}

/** 4 rotations pour chaque forme. */
export const TOWER_SHAPE_ROTATIONS: Readonly<Record<ShapeKey, readonly [Grid, Grid, Grid, Grid]>> =
  {
    I: buildRotations4(BASE_TOWER_SHAPES.I),
    O: buildRotations4(BASE_TOWER_SHAPES.O),
    T: buildRotations4(BASE_TOWER_SHAPES.T),
    L: buildRotations4(BASE_TOWER_SHAPES.L),
    J: buildRotations4(BASE_TOWER_SHAPES.J),
    S: buildRotations4(BASE_TOWER_SHAPES.S),
    Z: buildRotations4(BASE_TOWER_SHAPES.Z),
  }

/** Base (0°) grids for quick access. */
export const TOWER_SHAPES: Readonly<Record<ShapeKey, Grid>> = BASE_TOWER_SHAPES

/** Flat list of base shapes (utilisé par Zod refine, mocks, etc.). */
export const SHAPE_VALUES: readonly Grid[] = Object.values(TOWER_SHAPES) as readonly Grid[]

/** Helper d’accès par angle. */
export function getShape(key: ShapeKey, orientation: Orientation): Grid {
  const idx = orientation === 0 ? 0 : orientation === 90 ? 1 : orientation === 180 ? 2 : 3
  return TOWER_SHAPE_ROTATIONS[key][idx]
}
