'use client'
import { useGameState } from '@/stores/useGameState'
import { computeCoveredCells } from '@/utils/shapeUtils'
import { TILE_SIZE, ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { Cell } from './Cell'

export function GameCanvas() {
  const { towers, draggedTower, path, placeTowerAt } = useGameState()
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null)
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const onHover = (x: number, y: number) => {
    const newHover = x === -1 ? null : { x, y }
    if (
      !hoveredCellRef.current ||
      hoveredCellRef.current.x !== x ||
      hoveredCellRef.current.y !== y
    ) {
      hoveredCellRef.current = newHover
      forceUpdate() // facultatif si tu veux un effet visuel
    }
  }
  const previewCells = useMemo(() => {
    if (!draggedTower || !hoveredCell) return []
    return computeCoveredCells(hoveredCell.x, hoveredCell.y, draggedTower)
  }, [draggedTower, hoveredCell])

  const previewSet = useMemo(() => new Set(previewCells.map(p => `${p.x},${p.y}`)), [previewCells])

  const isPreview = (x: number, y: number) => previewSet.has(`${x},${y}`)

  const isPath = (x: number, y: number) => path.some(p => p.x === x && p.y === y)
  const handleHover = useCallback((x: number, y: number) => {
    if (x === -1) setHoveredCell(null)
    else setHoveredCell({ x, y })
  }, [])

  const handleClick = useCallback(
    (x: number, y: number) => {
      if (draggedTower) placeTowerAt(x, y, draggedTower)
    },
    [draggedTower, placeTowerAt]
  )
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
        const tower = towers.find(t => t.coveredCells.some(pos => pos.x === x && pos.y === y))

        return (
          <Cell
            key={`${x}-${y}`}
            x={x}
            y={y}
            tower={tower}
            isPath={isPath(x, y)}
            isPreview={isPreview(x, y)}
            draggedTower={draggedTower}
            onHover={handleHover}
            onClick={() => handleClick(x, y)}
          />
        )
      })}
    </div>
  )
}
