'use client'

import { useGameState } from '@/stores/useGameState'
import { computeCoveredCells } from '@/utils/shapeUtils'
import { TILE_SIZE, ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { Position } from '@tower-defense/types'
import { useEffect, useRef } from 'react'

export function GameCanvasCanvas() {
  const towers = useGameState(s => s.towers)
  const path = useGameState(s => s.path)
  const draggedTower = useGameState(s => s.draggedTower)
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const placeTowerAt = useGameState(s => s.placeTowerAt)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoveredCellRef = useRef<Position | null>(null)

  useEffect(() => {
    let frameId: number
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)

      // Grid
      ctx.strokeStyle = '#1f2937'
      for (let y = 0; y < ZONE_HEIGHT; y++) {
        for (let x = 0; x < ZONE_WIDTH; x++) {
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }

      // Path
      ctx.fillStyle = '#6b7280'
      path.forEach(({ x, y }) => {
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      })

      // Towers
      ctx.fillStyle = '#facc15'
      towers.forEach(tower => {
        tower.coveredCells.forEach(({ x, y }) => {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        })
      })

      // Ghost
      if (draggedTower && hoveredCellRef.current) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.6)'
        computeCoveredCells(
          hoveredCellRef.current.x,
          hoveredCellRef.current.y,
          draggedTower
        ).forEach(({ x, y }) => {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        })
      }
    }

    const loop = () => {
      draw()
      frameId = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(frameId)
  }, [towers, path, draggedTower])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE)
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE)
    if (
      !hoveredCellRef.current ||
      hoveredCellRef.current.x !== x ||
      hoveredCellRef.current.y !== y
    ) {
      hoveredCellRef.current = { x, y }
    }
  }

  const handleMouseUp = () => {
    if (draggedTower && hoveredCellRef.current) {
      placeTowerAt(hoveredCellRef.current.x, hoveredCellRef.current.y, draggedTower)
      setDraggedTower(null)

      const ghost = document.querySelector<HTMLDivElement>('[data-ghost]')
      if (ghost) {
        ghost.innerHTML = ''
        ghost.style.display = 'none'
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={ZONE_WIDTH * TILE_SIZE}
      height={ZONE_HEIGHT * TILE_SIZE}
      className="block border border-black"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  )
}
