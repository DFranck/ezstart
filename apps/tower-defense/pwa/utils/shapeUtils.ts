import { PlacedTower, Position, Tower } from '@tower-defense/types'

export function computeCoveredCells(x: number, y: number, tower: Tower): Position[] {
  const shape = tower.shape
  const cells: Position[] = []

  for (let dy = 0; dy < shape.length; dy++) {
    for (let dx = 0; dx < shape[dy].length; dx++) {
      if (shape[dy][dx]) {
        cells.push({ x: x + dx, y: y + dy })
      }
    }
  }

  return cells
}
export function isColliding(positions: Position[], towers: PlacedTower[]): boolean {
  const occupied = new Set(towers.flatMap(t => t.coveredCells.map(c => `${c.x},${c.y}`)))
  return positions.some(p => occupied.has(`${p.x},${p.y}`))
}
