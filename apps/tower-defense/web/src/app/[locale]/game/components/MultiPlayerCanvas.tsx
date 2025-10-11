'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import {
  ELEMENTAL_COLORS,
  ELEMENTAL_TYPES,
  PROJECTILE_CLEANUP_INTERVAL_MS,
  PROJECTILE_DURATION_RATIO,
  TICK_INTERVAL_MS,
  TILE_SIZE,
  ZONE_HEIGHT,
  ZONE_WIDTH,
} from '@tower-defense/config'
import { ActiveMob, InGamePlayer, PlacedTower, Position } from '@tower-defense/types'
import { computeCoveredCells, findPath, isColliding, paintFromElement } from '@tower-defense/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

  // 🚀 OPTIMIZATION 1: Offscreen canvas for static terrain
  const terrainCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // 🚀 OPTIMIZATION 3: Gradient cache
  const gradientCacheRef = useRef<Map<string, CanvasGradient>>(new Map())

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

  // Récupérer les mobs actifs qui ciblent ce joueur (mémorisé pour éviter re-renders inutiles)
  const targetPlayerId = isCurrentPlayer ? currentPlayer?._id : selectedPlayerId
  const activeMobs = useMemo(() => {
    return game?.activeMobs?.filter(mob => mob.targetPlayerId === targetPlayerId) || []
  }, [game?.activeMobs, targetPlayerId])

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
        existing.targetPosition.x !== mob.position.x ||
        existing.targetPosition.y !== mob.position.y
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
      // Filtrer les projectiles pour ce joueur uniquement
      const filteredProjectiles = incomingProjectiles.filter(p => p.playerId === selectedPlayerId)
      const newProjectiles = filteredProjectiles.map(p => ({
        ...p,
        startTime: now,
      }))
      setProjectiles(prev => [...prev, ...newProjectiles])
    }

    socket.on('projectiles', handleProjectiles)
    return () => {
      socket.off('projectiles', handleProjectiles)
    }
  }, [socket, selectedPlayerId])

  // Nettoyer les projectiles terminés
  useEffect(() => {
    // Durée synchronisée avec le tick (ratio * TICK_INTERVAL_MS)
    const PROJECTILE_DURATION = TICK_INTERVAL_MS * PROJECTILE_DURATION_RATIO
    const interval = setInterval(() => {
      const now = Date.now()
      setProjectiles(prev => prev.filter(p => now - p.startTime < PROJECTILE_DURATION))
    }, PROJECTILE_CLEANUP_INTERVAL_MS)

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

  // 🚀 OPTIMIZATION 1: Create offscreen canvas for static terrain
  useEffect(() => {
    if (!grassPattern || path.length === 0) return

    // Create offscreen canvas
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = ZONE_WIDTH * TILE_SIZE
    offscreenCanvas.height = ZONE_HEIGHT * TILE_SIZE
    const offscreenCtx = offscreenCanvas.getContext('2d')
    if (!offscreenCtx) return

    const pathSet = new Set(path.map(p => `${p.x},${p.y}`))

    // Draw grass (non-path areas) - ONCE
    for (let y = 0; y < ZONE_HEIGHT; y++) {
      for (let x = 0; x < ZONE_WIDTH; x++) {
        const key = `${x},${y}`
        if (!pathSet.has(key)) {
          offscreenCtx.save()
          offscreenCtx.translate(x * TILE_SIZE, y * TILE_SIZE)
          offscreenCtx.fillStyle = grassPattern
          offscreenCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
          offscreenCtx.restore()
        }
      }
    }

    // Draw path - ONCE
    offscreenCtx.fillStyle = '#6b7280'
    path.forEach(({ x, y }) => {
      offscreenCtx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
    })

    terrainCanvasRef.current = offscreenCanvas
  }, [path, grassPattern]) // Only rebuild when path or pattern changes

  // Rendu du canvas
  useEffect(() => {
    let frameId: number
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    // Performance monitoring
    let frameCount = 0
    let lastFpsTime = Date.now()
    let fps = 60

    const draw = () => {
      const frameStart = Date.now()
      ctx.clearRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)

      // 🚀 OPTIMIZATION 1: Draw static terrain from offscreen canvas (1 drawImage instead of 400 fillRect)
      if (terrainCanvasRef.current) {
        ctx.drawImage(terrainCanvasRef.current, 0, 0)
      } else {
        // Fallback: terrain non prêt
        ctx.fillStyle = '#90EE90'
        ctx.fillRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)
      }

      // 🚀 OPTIMIZATION 3: Cached gradients for towers
      type ElementalUnion =
        | (typeof ELEMENTAL_TYPES)[number]
        | readonly [(typeof ELEMENTAL_TYPES)[number], (typeof ELEMENTAL_TYPES)[number]]

      const getOrCreateGradient = (elementalType: ElementalUnion, x: number, y: number): CanvasGradient | string => {
        const cacheKey = `${JSON.stringify(elementalType)}-${x}-${y}`
        let gradient = gradientCacheRef.current.get(cacheKey)

        if (!gradient) {
          const paint = paintFromElement(elementalType)
          if (paint.kind === 'dual') {
            gradient = ctx.createLinearGradient(
              x * TILE_SIZE,
              y * TILE_SIZE,
              (x + 1) * TILE_SIZE,
              (y + 1) * TILE_SIZE
            )
            gradient.addColorStop(0, paint.color)
            gradient.addColorStop(1, paint.colorB!)
            gradientCacheRef.current.set(cacheKey, gradient)
          } else {
            return paint.color // Return color directly for non-gradients
          }
        }

        return gradient
      }

      // Tours du joueur avec couleurs élémentaires
      towers.forEach(tower => {
        if (!tower.elementalType) {
          // Fallback si pas de type défini
          ctx.fillStyle = isCurrentPlayer ? '#facc99' : '#ff9999'
          tower.coveredCells.forEach(({ x, y }) => {
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          })
          return
        }

        tower.coveredCells.forEach(({ x, y }) => {
          ctx.fillStyle = getOrCreateGradient(tower.elementalType!, x, y)
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

          // Bordure pour distinguer les towers adversaires
          if (!isCurrentPlayer) {
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 1
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          }
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
      const nowMobs = Date.now()

      // OPTIMISATION: Calculer toutes les positions interpolées UNE SEULE FOIS
      const interpolatedPositions = new Map<
        string,
        {
          x: number
          y: number
          centerX: number
          centerY: number
          mob: InterpolatedMob
        }
      >()

      interpolatedMobsRef.current.forEach(mob => {
        const elapsed = nowMobs - mob.lastUpdateTime
        const t = Math.min(elapsed / TICK_INTERVAL_MS, 1)
        const interpolatedX = mob.prevPosition.x + (mob.targetPosition.x - mob.prevPosition.x) * t
        const interpolatedY = mob.prevPosition.y + (mob.targetPosition.y - mob.prevPosition.y) * t
        const centerX = interpolatedX * TILE_SIZE + TILE_SIZE / 2
        const centerY = interpolatedY * TILE_SIZE + TILE_SIZE / 2

        interpolatedPositions.set(mob.id, {
          x: interpolatedX,
          y: interpolatedY,
          centerX,
          centerY,
          mob,
        })
      })

      // Grouper les mobs par position pour afficher le compte
      const mobsByPosition = new Map<string, Array<{ x: number; y: number; centerX: number; centerY: number; mob: InterpolatedMob }>>()
      interpolatedPositions.forEach(pos => {
        const key = `${Math.round(pos.x * 10)},${Math.round(pos.y * 10)}`
        if (!mobsByPosition.has(key)) {
          mobsByPosition.set(key, [])
        }
        mobsByPosition.get(key)!.push(pos)
      })

      // Mobs avec couleurs élémentaires
      interpolatedPositions.forEach(({ x: interpolatedX, y: interpolatedY, centerX, centerY, mob }) => {
        const radius = TILE_SIZE * 0.3

        // Couleur du mob selon son type élémentaire
        const mobColor = ELEMENTAL_COLORS[mob.mob.elementalType] || '#dc2626'
        ctx.fillStyle = mobColor

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
        }
      })

      // Afficher le nombre de mobs par position
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      mobsByPosition.forEach(mobs => {
        if (mobs.length > 1 && mobs[0]) {
          const { centerX, centerY } = mobs[0]
          const text = `x${mobs.length}`
          ctx.strokeText(text, centerX, centerY)
          ctx.fillText(text, centerX, centerY)
        }
      })

      // Projectiles avec compteur pour les superposés
      const PROJECTILE_DURATION = 200 // Durée synchronisée avec le tick serveur (250ms)

      // Grouper les projectiles par position
      const projectilesByPosition = new Map<string, typeof projectiles>()
      projectiles.forEach(proj => {
        const elapsed = now - proj.startTime
        const t = Math.min(elapsed / PROJECTILE_DURATION, 1)
        const x = proj.from.x + (proj.to.x - proj.from.x) * t
        const y = proj.from.y + (proj.to.y - proj.from.y) * t

        const key = `${Math.round(x * 10)},${Math.round(y * 10)}`
        if (!projectilesByPosition.has(key)) {
          projectilesByPosition.set(key, [])
        }
        projectilesByPosition.get(key)!.push(proj)
      })

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

      // Afficher le nombre de projectiles par position
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      projectilesByPosition.forEach((projs, key) => {
        if (projs.length > 1 && projs[0]) {
          const proj = projs[0]
          const elapsed = now - proj.startTime
          const t = Math.min(elapsed / PROJECTILE_DURATION, 1)
          const x = proj.from.x + (proj.to.x - proj.from.x) * t
          const y = proj.from.y + (proj.to.y - proj.from.y) * t

          const centerX = x * TILE_SIZE + TILE_SIZE / 2
          const centerY = y * TILE_SIZE + TILE_SIZE / 2 - 8 // Décalé vers le haut

          const text = `x${projs.length}`
          ctx.strokeText(text, centerX, centerY)
          ctx.fillText(text, centerX, centerY)
        }
      })

      // Bordure pour indiquer quel joueur on regarde
      if (!isCurrentPlayer && selectedPlayer) {
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 3
        ctx.strokeRect(0, 0, ZONE_WIDTH * TILE_SIZE, ZONE_HEIGHT * TILE_SIZE)
      }

      // Performance monitoring - FPS counter
      frameCount++
      const now = Date.now()
      if (now - lastFpsTime >= 1000) {
        fps = frameCount
        frameCount = 0
        lastFpsTime = now

        // Warn if FPS drops significantly
        if (fps < 30) {
          console.warn(
            `⚠️ [Canvas] Low FPS: ${fps} (${interpolatedMobsRef.current.size} mobs, ${towers.length} towers)`
          )
        }
      }

      // Log frame time if slow (> 16ms for 60 FPS)
      const frameTime = Date.now() - frameStart
      if (frameTime > 16) {
        console.warn(`⚠️ [Canvas] Slow frame: ${frameTime}ms`)
      }
    }

    const loop = () => {
      draw()
      frameId = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(frameId)
  }, [towers, path, draggedTower, grassPattern, isCurrentPlayer, selectedPlayer, activeMobs])

  const updateHoveredCell = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Calculer la taille réelle du canvas avec le responsive
    const scaleX = rect.width / (ZONE_WIDTH * TILE_SIZE)
    const scaleY = rect.height / (ZONE_HEIGHT * TILE_SIZE)

    const x = Math.floor((clientX - rect.left) / (TILE_SIZE * scaleX))
    const y = Math.floor((clientY - rect.top) / (TILE_SIZE * scaleY))

    if (
      !hoveredCellRef.current ||
      hoveredCellRef.current.x !== x ||
      hoveredCellRef.current.y !== y
    ) {
      hoveredCellRef.current = { x, y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCurrentPlayer) return
    updateHoveredCell(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isCurrentPlayer) return
    const touch = e.touches[0]
    if (touch) {
      console.log('[MultiPlayerCanvas] touchMove (React) - pos:', touch.clientX, touch.clientY)
      updateHoveredCell(touch.clientX, touch.clientY)
    }
  }

  const handlePlacement = useCallback(() => {
    console.log('[MultiPlayerCanvas] handlePlacement called')
    console.log('[MultiPlayerCanvas] - isCurrentPlayer:', isCurrentPlayer)
    console.log('[MultiPlayerCanvas] - draggedTower:', draggedTower)
    console.log('[MultiPlayerCanvas] - hoveredCell:', hoveredCellRef.current)
    console.log('[MultiPlayerCanvas] - currentPlayer:', !!currentPlayer)

    if (!isCurrentPlayer || !draggedTower || !hoveredCellRef.current || !currentPlayer) {
      console.log('[MultiPlayerCanvas] handlePlacement ABORTED - missing condition')
      return
    }

    const cells = computeCoveredCells(
      hoveredCellRef.current.x,
      hoveredCellRef.current.y,
      draggedTower
    )

    console.log('[MultiPlayerCanvas] - cells:', cells)
    const isInvalid = isColliding(cells, towers)
    console.log('[MultiPlayerCanvas] - isInvalid:', isInvalid)

    if (isInvalid) {
      console.log('[MultiPlayerCanvas] handlePlacement ABORTED - collision detected')
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
  }, [
    isCurrentPlayer,
    draggedTower,
    currentPlayer,
    towers,
    placeTowerAt,
    sendAction,
    onTowerPlace,
    setDraggedTower,
  ])

  // Écouter les touchmove et touchend au niveau window pour capturer TOUS les événements
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isCurrentPlayer) return
      const touch = e.touches[0]
      if (touch && canvasRef.current) {
        console.log('[MultiPlayerCanvas] touchMove (global) - pos:', touch.clientX, touch.clientY)
        updateHoveredCell(touch.clientX, touch.clientY)
      }
    }

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!isCurrentPlayer || !draggedTower) return
      console.log('[MultiPlayerCanvas] touchEnd (global) - calling handlePlacement')
      handlePlacement()
    }

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true })
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove)
      window.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [isCurrentPlayer, draggedTower, handlePlacement])

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
        className={`block border-2 w-full  h-auto ${isCurrentPlayer ? 'border-blue-400' : 'border-red-400'}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handlePlacement}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePlacement}
        style={{
          cursor: isCurrentPlayer && draggedTower ? 'crosshair' : 'default',
          touchAction: draggedTower ? 'none' : 'auto', // Empêche le scroll SEULEMENT pendant le drag
        }}
      />
    </div>
  )
}
