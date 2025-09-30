'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { TILE_SIZE, ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { ActiveMob, InGamePlayer, PlacedTower, Position } from '@tower-defense/types'
import { computeCoveredCells, findPath, isColliding } from '@tower-defense/utils'
import { useEffect, useRef, useState } from 'react'

interface MultiPlayerCanvasProps {
  selectedPlayerId: string | null
  onTowerPlace?: (x: number, y: number) => void
}

interface InterpolatedMob extends ActiveMob {
  prevPosition: Position
  targetPosition: Position
  lastUpdateTime: number
}

interface Projectile {
  id: string
  from: Position
  to: Position
  damage: number
  targetMobId: string
  startTime: number
}

export function MultiPlayerCanvas({ selectedPlayerId, onTowerPlace }: MultiPlayerCanvasProps) {
  const { game, sendAction, socket } = useGame()
  const draggedTower = useGameState(s => s.draggedTower)
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const placeTowerAt = useGameState(s => s.placeTowerAt)
  const currentPlayer = usePlayerStore(s => s.player)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoveredCellRef = useRef<Position | null>(null)
  const [grassPattern, setGrassPattern] = useState<CanvasPattern | null>(null)
  const interpolatedMobsRef = useRef<Map<string, InterpolatedMob>>(new Map())
  const [projectiles, setProjectiles] = useState<Projectile[]>([])

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

  // Récupérer les mobs actifs qui ciblent ce joueur
  const targetPlayerId = isCurrentPlayer ? currentPlayer?._id : selectedPlayerId
  const activeMobs: ActiveMob[] = game?.activeMobs?.filter(mob =>
    mob.targetPlayerId === targetPlayerId
  ) || []

  // Mettre à jour les positions interpolées quand on reçoit de nouvelles données
  useEffect(() => {
    const now = Date.now()
    const existingMobs = interpolatedMobsRef.current

    activeMobs.forEach(mob => {
      const existing = existingMobs.get(mob.id)

      if (!existing) {
        // Nouveau mob - initialiser sans interpolation
        existingMobs.set(mob.id, {
          ...mob,
          prevPosition: mob.position,
          targetPosition: mob.position,
          lastUpdateTime: now,
        })
      } else if (
        existing.position.x !== mob.position.x ||
        existing.position.y !== mob.position.y
      ) {
        // Position a changé - commencer l'interpolation
        existingMobs.set(mob.id, {
          ...mob,
          prevPosition: existing.targetPosition,
          targetPosition: mob.position,
          lastUpdateTime: now,
        })
      }
    })

    // Supprimer les mobs qui n'existent plus
    const activeMobIds = new Set(activeMobs.map(m => m.id))
    for (const [id] of existingMobs) {
      if (!activeMobIds.has(id)) {
        existingMobs.delete(id)
      }
    }
  }, [activeMobs])

  // S'assurer qu'on a un path pour le joueur actuel
  useEffect(() => {
    if (isCurrentPlayer && localPath.length === 0) {
      initPath()
    }
  }, [isCurrentPlayer, localPath.length, initPath])

  // Écouter les projectiles émis par le serveur
  useEffect(() => {
    if (!socket) return

    const handleProjectiles = (incomingProjectiles: any[]) => {
      const now = Date.now()
      const newProjectiles = incomingProjectiles.map(p => ({
        ...p,
        startTime: now,
      }))
      setProjectiles(prev => [...prev, ...newProjectiles])
    }

    socket.on('projectiles', handleProjectiles)
    return () => {
      socket.off('projectiles', handleProjectiles)
    }
  }, [socket])

  // Nettoyer les projectiles terminés
  useEffect(() => {
    const PROJECTILE_DURATION = 200
    const interval = setInterval(() => {
      const now = Date.now()
      setProjectiles(prev => prev.filter(p => now - p.startTime < PROJECTILE_DURATION))
    }, 50) // Vérifier toutes les 50ms

    return () => clearInterval(interval)
  }, [])

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

      // Mobs actifs avec interpolation fluide
      const now = Date.now()
      const TICK_INTERVAL = 500 // Intervalle entre les ticks (500ms)

      ctx.fillStyle = '#dc2626' // Rouge pour les mobs
      interpolatedMobsRef.current.forEach(mob => {
        // Calculer la position interpolée
        const elapsed = now - mob.lastUpdateTime
        const t = Math.min(elapsed / TICK_INTERVAL, 1) // Ratio d'avancement (0 à 1)

        const interpolatedX = mob.prevPosition.x + (mob.targetPosition.x - mob.prevPosition.x) * t
        const interpolatedY = mob.prevPosition.y + (mob.targetPosition.y - mob.prevPosition.y) * t

        const centerX = interpolatedX * TILE_SIZE + TILE_SIZE / 2
        const centerY = interpolatedY * TILE_SIZE + TILE_SIZE / 2
        const radius = TILE_SIZE * 0.3

        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        ctx.fill()

        // Barre de vie si le mob a pris des dégâts
        if (mob.currentHp < mob.mob.hp) {
          const hpRatio = mob.currentHp / mob.mob.hp
          const barWidth = TILE_SIZE * 0.8
          const barHeight = 4
          const barX = interpolatedX * TILE_SIZE + (TILE_SIZE - barWidth) / 2
          const barY = interpolatedY * TILE_SIZE - 8

          // Fond de la barre de vie
          ctx.fillStyle = '#4b5563'
          ctx.fillRect(barX, barY, barWidth, barHeight)

          // Barre de vie actuelle
          ctx.fillStyle = hpRatio > 0.5 ? '#16a34a' : hpRatio > 0.25 ? '#eab308' : '#dc2626'
          ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight)

          // Restaurer la couleur du mob
          ctx.fillStyle = '#dc2626'
        }
      })

      // Projectiles
      const PROJECTILE_DURATION = 200 // ms
      ctx.fillStyle = '#fbbf24' // Jaune/Orange pour les projectiles
      projectiles.forEach(proj => {
        const elapsed = now - proj.startTime
        const t = Math.min(elapsed / PROJECTILE_DURATION, 1)

        const x = proj.from.x + (proj.to.x - proj.from.x) * t
        const y = proj.from.y + (proj.to.y - proj.from.y) * t

        ctx.beginPath()
        ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 4, 0, 2 * Math.PI)
        ctx.fill()
      })

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
  }, [towers, path, draggedTower, grassPattern, isCurrentPlayer, selectedPlayer, activeMobs])

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
    const action = {
      type: 'placeTower' as const,
      payload: {
        playerId: currentPlayer?._id,
        x: hoveredCellRef.current.x,
        y: hoveredCellRef.current.y,
        towerType: draggedTower,
      },
    }
    console.log('[MultiPlayerCanvas] Sending placeTower action:', action)
    sendAction(action)

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
        className={`block border-2 w-full max-w-[600px] h-auto ${isCurrentPlayer ? 'border-blue-400' : 'border-red-400'}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isCurrentPlayer && draggedTower ? 'crosshair' : 'default' }}
      />
    </div>
  )
}
