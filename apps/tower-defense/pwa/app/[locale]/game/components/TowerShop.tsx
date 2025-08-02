'use client'
import { useGameState } from '@/stores/useGameState'
import { Div, H6 } from '@ezstart/ui/components'
import { logger } from '@ezstart/ui/lib'
import { TILE_SIZE } from '@tower-defense/config'
import { Game, mockTowers } from '@tower-defense/types'
import { useEffect, useState } from 'react'

type TowerShopProps = {
  game: Game
}

export function TowerShop({ game }: TowerShopProps) {
  const { draggedTower, setDraggedTower } = useGameState()
  const [towers] = useState(mockTowers)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  logger.debug('towers', towers)

  const handleMouseMove = (e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setDraggedTower(null)
    setMousePos(null)
  }

  useEffect(() => {
    if (draggedTower) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    } else {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedTower])

  return (
    <Div size={'xs'} layout={'grid'}>
      {/* Ghost preview */}
      {draggedTower && mousePos && (
        <div
          className="pointer-events-none fixed z-50 opacity-90"
          style={{
            top: mousePos.y + 4,
            left: mousePos.x + 4,
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${Math.max(
                ...draggedTower.shape.map(r => r.length)
              )},  ${TILE_SIZE}px)`,
            }}
          >
            {draggedTower.shape.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  style={{ width: TILE_SIZE, height: TILE_SIZE }}
                  className={`rounded-sm ${cell ? 'bg-green-500' : 'bg-gray-400'}`}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Tower list */}
      {towers.map(tower => (
        <Div
          size={'xs'}
          variant={'card'}
          layout={'col'}
          key={tower._id}
          onMouseEnter={() => setMousePos(null)} // reset preview pos if any
        >
          <H6 className="line-clamp-1">{tower.name}</H6>
          <Div
            onMouseDown={e => {
              e.preventDefault()
              setDraggedTower(tower)
              setMousePos({ x: e.clientX, y: e.clientY })
            }}
            className="inline-grid cursor-grab active:cursor-grabbing"
            style={{
              gridTemplateColumns: `repeat(${Math.max(
                ...tower.shape.map(row => row.length)
              )}, ${TILE_SIZE}px)`,
            }}
          >
            {tower.shape.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  style={{ width: TILE_SIZE, height: TILE_SIZE }}
                  className={`rounded-sm ${cell ? 'bg-green-500' : 'bg-gray-400'}`}
                />
              ))
            )}
          </Div>
        </Div>
      ))}
    </Div>
  )
}
