'use client'

import { useGameState } from '@/stores/useGameState'
import { cn } from '@ezstart/ui/lib'
import { TILE_SIZE, ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'

export function GameCanvas() {
  const { towers, draggedTower, path, placeTowerAt } = useGameState()

  return (
    <div
      className="relative grid"
      style={{
        width: ZONE_WIDTH * TILE_SIZE,
        height: ZONE_HEIGHT * TILE_SIZE,
        gridTemplateRows: `repeat(${ZONE_HEIGHT}, ${TILE_SIZE}px)`,
        gridTemplateColumns: `repeat(${ZONE_WIDTH}, ${TILE_SIZE}px)`,
      }}
    >
      {Array.from({ length: ZONE_HEIGHT * ZONE_WIDTH }).map((_, i) => {
        const x = i % ZONE_WIDTH
        const y = Math.floor(i / ZONE_WIDTH)
        const isPath = path.some(p => p.x === x && p.y === y)
        const tower = towers.find(t => t.coveredCells.some(pos => pos.x === x && pos.y === y))

        return (
          <div
            key={`${x}-${y}`}
            className={cn(
              'border border-gray-800',
              'w-full h-full',
              isPath ? 'bg-gray-500/50' : 'bg-green-700'
            )}
            onMouseUp={() => {
              if (draggedTower) {
                // Appelle ici une action du store pour placer la tour
                placeTowerAt(x, y, draggedTower)
              }
            }}
          >
            {tower && <div className="w-full h-full bg-yellow-400" />}
          </div>
        )
      })}
    </div>
  )
}
