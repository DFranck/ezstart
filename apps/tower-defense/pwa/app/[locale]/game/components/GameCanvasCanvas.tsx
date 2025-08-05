'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { TILE_SIZE, ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { Position } from '@tower-defense/types'
import { computeCoveredCells, isColliding } from '@tower-defense/utils'
import { useEffect, useRef, useState } from 'react'

export function GameCanvasCanvas() {
  const towers = useGameState(s => s.towers)
  const path = useGameState(s => s.path)
  const draggedTower = useGameState(s => s.draggedTower)
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const placeTowerAt = useGameState(s => s.placeTowerAt)
  const { game, sendAction } = useGame()
  const currentPlayerId = usePlayerStore(s => s.player)?._id
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoveredCellRef = useRef<Position | null>(null)
  const [grassPattern, setGrassPattern] = useState<CanvasPattern | null>(null)

  // useEffect(() => {
  //   const image = new Image()
  //   image.src = '/assets/sprites/seamless/grass.png'
  //   image.onload = () => {
  //     const ctx = canvasRef.current?.getContext('2d')
  //     if (ctx) {
  //       const pattern = ctx.createPattern(image, 'repeat')
  //       if (pattern) setGrassPattern(pattern)
  //     }
  //   }
  // }, [])
  useEffect(() => {
    const image = new Image()
    image.src = '/assets/sprites/seamless/grass.png'
    image.onload = () => {
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = TILE_SIZE
      tmpCanvas.height = TILE_SIZE

      const tmpCtx = tmpCanvas.getContext('2d')
      if (!tmpCtx) return

      tmpCtx.drawImage(image, 0, 0, TILE_SIZE, TILE_SIZE)

      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) {
        const pattern = ctx.createPattern(tmpCanvas, 'repeat')
        if (pattern) setGrassPattern(pattern)
      }
    }
  }, [])
  useEffect(() => {
    let frameId: number
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const pathSet = new Set(path.map(p => `${p.x},${p.y}`))

    const draw = () => {
      ctx.clearRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)

      // Fond herbe (hors path)
      if (grassPattern) {
        for (let y = 0; y < ZONE_HEIGHT; y++) {
          for (let x = 0; x < ZONE_WIDTH; x++) {
            const key = `${x},${y}`
            if (!pathSet.has(key)) {
              ctx.save()
              ctx.translate(x * TILE_SIZE, y * TILE_SIZE)
              ctx.fillStyle = grassPattern!
              ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
              ctx.restore()
            }
          }
        }
      }

      // Path
      ctx.fillStyle = '#6b7280'
      path.forEach(({ x, y }) => {
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      })

      // Towers
      ctx.fillStyle = '#facc99'
      towers.forEach(tower => {
        tower.coveredCells.forEach(({ x, y }) => {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        })
      })

      // Ghost
      if (draggedTower && hoveredCellRef.current) {
        const cells = computeCoveredCells(
          hoveredCellRef.current.x,
          hoveredCellRef.current.y,
          draggedTower
        )
        const isInvalid = isColliding(cells, towers)

        ctx.fillStyle = isInvalid ? 'rgba(239, 68, 68, 0.6)' : 'rgba(74, 222, 128, 0.6)' // rouge ou vert

        for (const { x, y } of cells) {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    const loop = () => {
      draw()
      frameId = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(frameId)
  }, [towers, path, draggedTower, grassPattern])

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
    if (!draggedTower || !hoveredCellRef.current) return

    const cells = computeCoveredCells(
      hoveredCellRef.current.x,
      hoveredCellRef.current.y,
      draggedTower
    )

    const isInvalid = isColliding(cells, towers)

    if (isInvalid) {
      console.warn('[handleMouseUp] Tower placement blocked due to collision.')
      return // ❌ Ne place pas la tower
    }

    placeTowerAt(hoveredCellRef.current.x, hoveredCellRef.current.y, draggedTower)
    sendAction({
      type: 'placeTower',
      payload: {
        playerId: currentPlayerId,
        x: hoveredCellRef.current.x,
        y: hoveredCellRef.current.y,
        towerType: draggedTower,
      },
    })

    setDraggedTower(null)

    const ghost = document.querySelector<HTMLDivElement>('[data-ghost]')
    if (ghost) {
      ghost.innerHTML = ''
      ghost.style.display = 'none'
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
