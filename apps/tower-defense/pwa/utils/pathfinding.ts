import { ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { Position } from '@tower-defense/types'

export function findPath(start: Position, end: Position, blocked: Position[]): Position[] {
  const blockedSet = new Set(blocked.map(p => `${p.x},${p.y}`))
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < ZONE_WIDTH && y < ZONE_HEIGHT

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ]

  const queue: Position[] = [start]
  const cameFrom = new Map<string, Position | null>()
  cameFrom.set(`${start.x},${start.y}`, null)

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.x === end.x && current.y === end.y) break

    for (const { dx, dy } of directions) {
      const nx = current.x + dx
      const ny = current.y + dy
      const key = `${nx},${ny}`

      if (!inBounds(nx, ny)) continue
      if (blockedSet.has(key)) continue
      if (cameFrom.has(key)) continue

      cameFrom.set(key, current)
      queue.push({ x: nx, y: ny })
    }
  }

  // reconstruct path
  const path: Position[] = []
  let current: Position | undefined = end
  while (current) {
    path.unshift(current)
    current = cameFrom.get(`${current.x},${current.y}`) || undefined
  }

  // If the path doesn't start with the real start, no path found
  if (path.length === 0 || path[0].x !== start.x || path[0].y !== start.y) {
    return []
  }

  return path
}
