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

  const startDraggingTower = (towerIndex: number, clientX: number, clientY: number) => {
    const tower = towers[towerIndex]
    setDraggedTower(tower)
    renderGhost(tower.shape)

    if (ghostRef.current) {
      ghostRef.current.style.left = `${clientX + 4}px`
      ghostRef.current.style.top = `${clientY + 4}px`
    }
  }

  const handleMouseDown = (towerIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    startDraggingTower(towerIndex, e.clientX, e.clientY)
  }

  const handleTouchStart = (towerIndex: number) => (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    startDraggingTower(towerIndex, touch.clientX, touch.clientY)
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      if (ghostRef.current) {
        ghostRef.current.style.left = `${clientX + 4}px`
        ghostRef.current.style.top = `${clientY + 4}px`
      }
    }

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement) ?? null
      const isCanvas = target?.closest('canvas')

      if (!isCanvas) {
        setDraggedTower(null)
        if (ghostRef.current) {
          ghostRef.current.innerHTML = ''
          ghostRef.current.style.display = 'none'
        }
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [setDraggedTower])

  return (
    <div className="relative">
      <div ref={ghostRef} data-ghost className="pointer-events-none fixed z-50 opacity-90" />

      <div className="grid gap-2">
        {towers.map((tower, index) => (
          <div
            key={tower._id}
            className="rounded shadow p-2 cursor-grab active:cursor-grabbing touch-none"
            onMouseDown={handleMouseDown(index)}
            onTouchStart={handleTouchStart(index)}
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
