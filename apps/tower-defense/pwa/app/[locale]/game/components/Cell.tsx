'use client'

import { cn } from '@ezstart/ui/lib'
import { PlacedTower, Tower } from '@tower-defense/types'
import { memo } from 'react'

type CellProps = {
  x: number
  y: number
  draggedTower: Tower | null
  tower?: PlacedTower
  isPath: boolean
  isPreview: boolean
  onHover: (x: number, y: number) => void
  onClick: () => void
}

function CellComponent({
  x,
  y,
  tower,
  isPath,
  isPreview,
  onHover,
  onClick,
  draggedTower,
}: CellProps) {
  console.log(`[RENDER] Cell ${x},${y}`)
  const handleMouseEnter = () => {
    if (!draggedTower) return
    onHover(x, y)
  }

  const handleMouseLeave = () => {
    onHover(-1, -1)
  }

  return (
    <div
      className={cn(
        'border border-gray-800 w-full h-full',
        isPreview
          ? 'bg-green-400/60'
          : tower
            ? 'bg-yellow-400'
            : isPath
              ? 'bg-gray-500/50'
              : 'bg-green-700'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={onClick}
    >
      {tower && <div className="w-full h-full bg-yellow-400" />}
    </div>
  )
}

function areEqual(prev: CellProps, next: CellProps): boolean {
  return (
    prev.tower === next.tower &&
    prev.isPath === next.isPath &&
    prev.isPreview === next.isPreview &&
    prev.draggedTower === next.draggedTower
  )
}

export const Cell = memo(CellComponent, areEqual)
