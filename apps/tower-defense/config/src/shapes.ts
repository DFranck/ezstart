// path: @tower-defense/config/src/shapes.ts
/**
 * Tower shapes - 3×3 grid max with connected cells.
 * Boolean grids: `true` = occupied cell, `false` = empty.
 * All shapes must be connected (no separate zones) and fit in 3×3.
 */

export type Cell = boolean
export type NonEmptyRow = readonly [Cell, ...Cell[]]
export type NonEmptyGrid = readonly [NonEmptyRow, ...NonEmptyRow[]]
export type Grid = NonEmptyGrid
export type Orientation = 0 | 90 | 180 | 270

/** Helper to check if a shape has all cells connected */
function isConnected(grid: readonly (readonly boolean[])[]): boolean {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (rows === 0 || cols === 0) return false

  // Find first true cell
  let startR = -1, startC = -1
  for (let r = 0; r < rows && startR === -1; r++) {
    for (let c = 0; c < cols && startC === -1; c++) {
      if (grid[r]?.[c]) {
        startR = r
        startC = c
      }
    }
  }
  if (startR === -1) return false // No true cells

  // Flood fill to count connected cells
  const visited = new Set<string>()
  const queue: [number, number][] = [[startR, startC]]
  let connectedCount = 0

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)

    if (r < 0 || r >= rows || c < 0 || c >= cols || !grid[r]?.[c]) continue
    connectedCount++

    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1])
  }

  // Count total true cells
  let totalTrue = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r]?.[c]) totalTrue++
    }
  }

  return connectedCount === totalTrue
}

/** All possible connected shapes from 1-9 cells in 3×3 grid */
export const TOWER_SHAPES_3x3: readonly NonEmptyGrid[] = [
  // 1 cell
  [[true]],

  // 2 cells
  [[true, true]],
  [[true], [true]],

  // 3 cells - Line
  [[true, true, true]],
  [[true], [true], [true]],

  // 3 cells - L shapes
  [[true, true], [true, false]],
  [[true, true], [false, true]],
  [[true, false], [true, true]],
  [[false, true], [true, true]],

  // 4 cells - Square
  [[true, true], [true, true]],

  // 4 cells - T shapes
  [[true, true, true], [false, true, false]],
  [[true, false], [true, true], [true, false]],
  [[false, true, false], [true, true, true]],
  [[false, true], [true, true], [false, true]],

  // 4 cells - L shapes
  [[true, false], [true, false], [true, true]],
  [[false, true], [false, true], [true, true]],
  [[true, true], [true, false], [true, false]],
  [[true, true], [false, true], [false, true]],

  // 4 cells - Z shapes
  [[true, true, false], [false, true, true]],
  [[false, true, true], [true, true, false]],
  [[true, false], [true, true], [false, true]],
  [[false, true], [true, true], [true, false]],

  // 5 cells - Plus
  [[false, true, false], [true, true, true], [false, true, false]],

  // 5 cells - T variations
  [[true, true, true], [false, true, false], [false, true, false]],
  [[false, true, false], [false, true, false], [true, true, true]],
  [[true, false, false], [true, true, true], [true, false, false]],
  [[false, false, true], [true, true, true], [false, false, true]],
] as const

/** Flat list of all valid shapes (used by validation) */
export const SHAPE_VALUES: readonly Grid[] = TOWER_SHAPES_3x3 as readonly Grid[]

/** Validate shape: max 3×3, connected cells, at least 1 cell */
export function isValidTowerShape(grid: readonly (readonly boolean[])[]): boolean {
  const rows = grid.length
  if (rows === 0 || rows > 3) return false

  const cols = grid[0]?.length ?? 0
  if (cols === 0 || cols > 3) return false

  // Check rectangular
  for (let r = 0; r < rows; r++) {
    if (grid[r]?.length !== cols) return false
  }

  // Must have at least one true cell
  let hasTrue = false
  for (let r = 0; r < rows && !hasTrue; r++) {
    for (let c = 0; c < cols && !hasTrue; c++) {
      if (grid[r]?.[c]) hasTrue = true
    }
  }
  if (!hasTrue) return false

  // Must be connected
  return isConnected(grid)
}
