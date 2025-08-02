'use client'

import { useGameState } from '@/stores/useGameState'
import { Div } from '@ezstart/ui/components'
import { TILE_SIZE } from '@tower-defense/config'
import { Game, mockTowers } from '@tower-defense/types'
import { useEffect, useRef, useState } from 'react'

type TowerShopProps = {
  game: Game
}

export function TowerShop({ game }: TowerShopProps) {
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const [towers] = useState(mockTowers)
  const ghostRef = useRef<HTMLDivElement>(null)

  // Attach ghost follow and cleanup
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX + 4}px`
        ghostRef.current.style.top = `${e.clientY + 4}px`
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      const isCanvas = (e.target as HTMLElement).closest('canvas')
      if (!isCanvas) {
        setDraggedTower(null)
        if (ghostRef.current) {
          ghostRef.current.innerHTML = ''
          ghostRef.current.style.display = 'none'
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setDraggedTower])

  const renderGhost = (shape: boolean[][]) => {
    if (!ghostRef.current) return
    ghostRef.current.innerHTML = ''
    ghostRef.current.style.display = 'grid'
    ghostRef.current.style.gridTemplateColumns = `repeat(${shape[0].length}, ${TILE_SIZE}px)`

    shape.forEach(row =>
      row.forEach(cell => {
        const div = document.createElement('div')
        div.style.width = `${TILE_SIZE}px`
        div.style.height = `${TILE_SIZE}px`
        div.className = `rounded-sm ${cell ? 'bg-green-500' : 'bg-gray-400'}`
        ghostRef.current?.appendChild(div)
      })
    )
  }

  const handleGrab = (towerIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    const tower = towers[towerIndex]
    setDraggedTower(tower)
    renderGhost(tower.shape)
  }

  return (
    <div className="relative">
      <div ref={ghostRef} data-ghost className="pointer-events-none fixed z-50 opacity-90" />
      <div className="grid gap-2">
        {towers.map((tower, index) => (
          <div
            key={tower._id}
            className="rounded shadow p-2 cursor-grab active:cursor-grabbing"
            onMouseDown={handleGrab(index)}
          >
            <span className="text-xs font-medium">{tower.name}</span>
            <Div
              className="inline-grid mt-1"
              style={{
                gridTemplateColumns: `repeat(${Math.max(...tower.shape.map(r => r.length))}, ${TILE_SIZE}px)`,
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
          </div>
        ))}
      </div>
    </div>
  )
}
