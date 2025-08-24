'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { TILE_SIZE, ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { InGamePlayer, PlacedTower, Position } from '@tower-defense/types'
import { computeCoveredCells, findPath, isColliding } from '@tower-defense/utils'
import { useEffect, useRef, useState } from 'react'

interface MultiPlayerCanvasProps {
  selectedPlayerId: string | null
  onTowerPlace?: (x: number, y: number) => void
}

export function MultiPlayerCanvas({ selectedPlayerId, onTowerPlace }: MultiPlayerCanvasProps) {
  const { game, sendAction } = useGame()
  const draggedTower = useGameState(s => s.draggedTower)
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const placeTowerAt = useGameState(s => s.placeTowerAt)
  const currentPlayer = usePlayerStore(s => s.player)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoveredCellRef = useRef<Position | null>(null)
  const [grassPattern, setGrassPattern] = useState<CanvasPattern | null>(null)

  // Récupérer les données locales pour le joueur actuel
  const localTowers = useGameState(s => s.towers)
  const localPath = useGameState(s => s.path)
  const initPath = useGameState(s => s.initPath)

  // Trouver les données du joueur sélectionné
  const selectedPlayer: InGamePlayer | null = selectedPlayerId
    ? game?.players?.find(p => p.player?._id === selectedPlayerId) || null
    : null

  const isCurrentPlayer = selectedPlayerId === currentPlayer?._id

  // Utiliser les données locales pour le joueur actuel, sinon les données serveur
  const towers: PlacedTower[] = isCurrentPlayer ? localTowers : selectedPlayer?.placedTowers || []

  // Calculer le path pour le joueur sélectionné
  const path: Position[] = isCurrentPlayer
    ? localPath
    : selectedPlayer
      ? findPath(selectedPlayer.placedTowers.flatMap((t: any) => t.coveredCells))
      : []

  // S'assurer qu'on a un path pour le joueur actuel
  useEffect(() => {
    if (isCurrentPlayer && localPath.length === 0) {
      initPath()
    }
  }, [isCurrentPlayer, localPath.length, initPath])

  // Charger le pattern d'herbe
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

  // Rendu du canvas
  useEffect(() => {
    let frameId: number
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const pathSet = new Set(path.map(p => `${p.x},${p.y}`))

    const draw = () => {
      ctx.clearRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)

      // Fond herbe (hors path)
      for (let y = 0; y < ZONE_HEIGHT; y++) {
        for (let x = 0; x < ZONE_WIDTH; x++) {
          const key = `${x},${y}`
          if (!pathSet.has(key)) {
            ctx.save()
            ctx.translate(x * TILE_SIZE, y * TILE_SIZE)

            if (grassPattern) {
              ctx.fillStyle = grassPattern
            } else {
              // Fallback si la texture n'est pas chargée
              ctx.fillStyle = '#90EE90' // Vert clair
            }

            ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
            ctx.restore()
          }
        }
      }

      // Path
      ctx.fillStyle = '#6b7280'
      path.forEach(({ x, y }) => {
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      })

      // Tours du joueur
      if (isCurrentPlayer) {
        // Tours du joueur actuel - couleur normale
        ctx.fillStyle = '#facc99'
      } else {
        // Tours des adversaires - couleur différente
        ctx.fillStyle = '#ff9999'
      }

      towers.forEach(tower => {
        tower.coveredCells.forEach(({ x, y }) => {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        })
      })

      // Ghost (seulement pour le joueur actuel)
      if (isCurrentPlayer && draggedTower && hoveredCellRef.current) {
        const cells = computeCoveredCells(
          hoveredCellRef.current.x,
          hoveredCellRef.current.y,
          draggedTower
        )
        const isInvalid = isColliding(cells, towers)

        ctx.fillStyle = isInvalid ? 'rgba(239, 68, 68, 0.6)' : 'rgba(74, 222, 128, 0.6)'

        for (const { x, y } of cells) {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }

      // Bordure pour indiquer quel joueur on regarde
      if (!isCurrentPlayer && selectedPlayer) {
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 3
        ctx.strokeRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)
      }
    }

    const loop = () => {
      draw()
      frameId = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(frameId)
  }, [towers, path, draggedTower, grassPattern, isCurrentPlayer, selectedPlayer])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCurrentPlayer) return // Pas d'interaction sur les canvas des adversaires

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
    if (!isCurrentPlayer || !draggedTower || !hoveredCellRef.current || !currentPlayer) return

    const cells = computeCoveredCells(
      hoveredCellRef.current.x,
      hoveredCellRef.current.y,
      draggedTower
    )

    const isInvalid = isColliding(cells, towers)

    if (isInvalid) {
      return
    }

    // 1. Placer la tour localement pour feedback immédiat
    placeTowerAt(hoveredCellRef.current.x, hoveredCellRef.current.y, draggedTower)

    // 2. Envoyer l'action au serveur pour propagation aux autres joueurs
    sendAction({
      type: 'placeTower',
      payload: {
        playerId: currentPlayer?._id,
        x: hoveredCellRef.current.x,
        y: hoveredCellRef.current.y,
        towerType: draggedTower,
      },
    })

    // 3. Callback pour le parent
    onTowerPlace?.(hoveredCellRef.current.x, hoveredCellRef.current.y)

    setDraggedTower(null)

    const ghost = document.querySelector<HTMLDivElement>('[data-ghost]')
    if (ghost) {
      ghost.innerHTML = ''
      ghost.style.display = 'none'
    }
  }

  // Si aucun joueur sélectionné ET pas le joueur actuel, afficher le message
  if (!selectedPlayer && !isCurrentPlayer) {
    return (
      <div className="flex items-center justify-center w-full h-[600px] bg-gray-100 border border-gray-300 rounded">
        <div className="text-center text-gray-500">
          <p>Sélectionnez un joueur pour voir son canvas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Label du joueur */}
      <div className="absolute -top-8 left-0 z-10">
        <div
          className={`px-3 py-1 rounded text-sm font-medium ${
            isCurrentPlayer
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {isCurrentPlayer ? `${currentPlayer?.name || 'Vous'}` : `Adversaire`}
          <span className="ml-2 text-xs opacity-75">({towers.length} tours placées)</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={ZONE_WIDTH * TILE_SIZE}
        height={ZONE_HEIGHT * TILE_SIZE}
        className={`block border-2 ${isCurrentPlayer ? 'border-blue-400' : 'border-red-400'}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isCurrentPlayer && draggedTower ? 'crosshair' : 'default' }}
      />
    </div>
  )
}
