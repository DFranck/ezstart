'use client'

import { useGameState } from '@/stores/useGameState'
import { Button, Div } from '@ezstart/ui/components'
import { Game, mockTowers } from '@tower-defense/types'
import { useEffect, useRef, useState } from 'react'
import { Tower } from './Tower'

type TowerShopProps = {
  game: Game
}

export function TowerShop({ game }: TowerShopProps) {
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const [towers, setTowers] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const towerRefs = useRef<(HTMLDivElement | null)[]>([])
  const shopContainerRef = useRef<HTMLDivElement>(null)

  // Initialiser les towers côté client seulement pour éviter l'hydratation mismatch
  useEffect(() => {
    setIsClient(true)
    setTowers(mockTowers(5))
  }, [])

  const startDraggingTower = (towerIndex: number) => {
    const tower = towers[towerIndex]
    setDraggedTower(tower)
    // Ghost tower preview removed - only grid cells preview needed
  }

  const handleMouseDown = (towerIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    startDraggingTower(towerIndex)
  }

  const handleTouchStart = (towerIndex: number) => (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      startDraggingTower(towerIndex)
    }
  }

  // Attach touch listeners manually with { passive: false } to allow preventDefault
  useEffect(() => {
    const listeners: Array<{ ref: HTMLDivElement; handler: (e: TouchEvent) => void }> = []

    towerRefs.current.forEach((ref, index) => {
      if (!ref) return

      const handleTouchStartNative = (e: TouchEvent) => {
        console.log('[TowerShop] NATIVE touchstart - index:', index)
        // Rendre le container transparent IMMÉDIATEMENT (sans attendre React)
        if (shopContainerRef.current) {
          shopContainerRef.current.style.pointerEvents = 'none'
          shopContainerRef.current.style.opacity = '0.5'
        }
        const touch = e.touches[0]
        if (touch) {
          console.log('[TowerShop] Starting drag - pos:', touch.clientX, touch.clientY)
          startDraggingTower(index)
        }
      }

      ref.addEventListener('touchstart', handleTouchStartNative, { passive: false })
      listeners.push({ ref, handler: handleTouchStartNative })
    })

    return () => {
      listeners.forEach(({ ref, handler }) => {
        ref.removeEventListener('touchstart', handler)
      })
    }
  }, [towers])

  useEffect(() => {
    const handleEnd = (e: MouseEvent | TouchEvent) => {
      // Restaurer le container shop
      if (shopContainerRef.current) {
        shopContainerRef.current.style.pointerEvents = ''
        shopContainerRef.current.style.opacity = ''
      }

      // Pour touchend, utiliser changedTouches au lieu de touches
      const clientX =
        'changedTouches' in e ? e.changedTouches[0]?.clientX || 0 : (e as MouseEvent).clientX
      const clientY =
        'changedTouches' in e ? e.changedTouches[0]?.clientY || 0 : (e as MouseEvent).clientY

      // Vérifier si on a laché sur le canvas
      const elementAtPoint = document.elementFromPoint(clientX, clientY)
      const isCanvas = elementAtPoint?.closest('canvas')

      if (!isCanvas) {
        // Annuler le drag si pas sur le canvas
        setDraggedTower(null)
      }
      // Sinon le canvas gérera le placement via son propre touchend
    }

    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [setDraggedTower])

  // Afficher un placeholder pendant l'hydratation
  if (!isClient) {
    return (
      <div className="relative">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex justify-center items-center h-16 bg-gray-100 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Desktop: Grid 2 cols */}
      <div className="hidden md:grid md:grid-cols-2 gap-2">
        {towers.map((tower, index) => (
          <div
            key={tower._id}
            className="active:cursor-grabbing cursor-grab touch-none flex justify-center items-center"
            onMouseDown={handleMouseDown(index)}
            onTouchStart={handleTouchStart(index)}
          >
            <Div className="inline-grid mt-1">
              <Tower tower={tower} />
            </Div>
          </div>
        ))}
        <Button onClick={() => setTowers(mockTowers(5))}>Refresh</Button>
      </div>

      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden" ref={shopContainerRef}>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {towers.map((tower, index) => (
            <div
              key={tower._id}
              ref={el => {
                towerRefs.current[index] = el
              }}
              className="flex-shrink-0 active:scale-95 touch-none transition-transform"
              onMouseDown={handleMouseDown(index)}
            >
              <Div className="inline-grid bg-muted/50 p-2 rounded-lg border-2 border-transparent active:border-primary">
                <Tower tower={tower} />
              </Div>
            </div>
          ))}
          <button
            onClick={() => setTowers(mockTowers(5))}
            className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  )
}
