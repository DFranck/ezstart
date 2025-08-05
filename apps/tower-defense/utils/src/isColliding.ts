import { PlacedTower, Position, Tower } from '@tower-defense/types'


export function isColliding(positions: Position[], towers: PlacedTower[]): boolean {
  const occupied = new Set(towers.flatMap(t => t.coveredCells.map(c => `${c.x},${c.y}`)))
  return positions.some(p => occupied.has(`${p.x},${p.y}`))
}
