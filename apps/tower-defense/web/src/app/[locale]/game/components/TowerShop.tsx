'use client'

import { useGameState } from '@/stores/useGameState'
import { Button, Icon } from '@ezstart/ui/components'
import { calculateTowerPrice, isTowerAllowedAtTier } from '@tower-defense/config'
import type { Game, ShopItem, TowerType } from '@tower-defense/types'
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'
import { useEffect, useRef, useState } from 'react'
import { Tower } from './Tower'

type TowerShopProps = {
  game: Game
}

export function TowerShop({ game }: TowerShopProps) {
  const setDraggedTower = useGameState(s => s.setDraggedTower)
  const gold = useGameState(s => s.gold)
  const spendGold = useGameState(s => s.spendGold)
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [isClient, setIsClient] = useState(false)
  const [currentTier, setCurrentTier] = useState(1)
  const towerRefs = useRef<(HTMLDivElement | null)[]>([])
  const shopContainerRef = useRef<HTMLDivElement>(null)

  // Get current player's tier from game state
  useEffect(() => {
    const currentPlayerId = game.players[0]?.player?._id // TODO: Get actual current player
    const currentPlayer = game.players.find(p => p.player?._id === currentPlayerId)
    if (currentPlayer?.tier && currentPlayer.tier !== currentTier) {
      console.log('[TowerShop] Tier changed:', currentTier, '→', currentPlayer.tier)
      setCurrentTier(currentPlayer.tier)
    }
  }, [game.players, currentTier])

  // Get available towers for current tier (from shared config)
  const getAvailableTowersForTier = (tier: number): TowerType[] => {
    return ENTITY_TOWER_TYPES.filter(tower => {
      const price = calculateTowerPrice(tower)
      return isTowerAllowedAtTier(tower, tier, price)
    })
  }

  // Generate a single tower with tier filtering
  const generateOneTower = (tier: number): ShopItem => {
    const availableTowers = getAvailableTowersForTier(tier)

    if (availableTowers.length === 0) {
      console.warn('[TowerShop] No towers available for tier:', tier)
      // Fallback to basic tower
      const basicTower = ENTITY_TOWER_TYPES[0]!
      return {
        type: 'tower' as const,
        basePrice: calculateTowerPrice(basicTower),
        tower: basicTower,
      }
    }

    // Pick random tower from available ones
    const randomIndex = Math.floor(Math.random() * availableTowers.length)
    const tower = availableTowers[randomIndex]!

    const price = calculateTowerPrice(tower)
    console.log('[TowerShop] Generated tower:', tower.name, 'price:', price, 'tier:', tier)

    return {
      type: 'tower' as const,
      basePrice: price,
      tower,
    }
  }

  // Generate towers with tier filtering
  const generateTowers = () => {
    console.log('[TowerShop] Generating towers for tier:', currentTier)
    const items: ShopItem[] = Array.from({ length: 5 }, () => generateOneTower(currentTier))
    setShopItems(items)
  }

  // Replace a tower at specific index
  const replaceTowerAt = (index: number) => {
    setShopItems(prev => {
      const newItems = [...prev]
      newItems[index] = generateOneTower(currentTier)
      return newItems
    })
  }

  // Initialiser les shop items côté client
  useEffect(() => {
    setIsClient(true)
    generateTowers()
  }, [currentTier])

  const startDraggingTower = (itemIndex: number) => {
    const item = shopItems[itemIndex]
    if (!item || item.type !== 'tower') return

    // Check if player has enough gold
    if (gold < item.basePrice) {
      console.log('[TowerShop] Not enough gold:', gold, '<', item.basePrice)
      return
    }

    setDraggedTower(item.tower, item.basePrice)

    // Replace the tower in the shop immediately
    replaceTowerAt(itemIndex)
  }

  const handleMouseDown = (itemIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    startDraggingTower(itemIndex)
  }

  const handleTouchStart = (itemIndex: number) => (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      startDraggingTower(itemIndex)
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
  }, [shopItems])

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

      // Vérifier si on a lâché sur le canvas
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
      <div className="relative z-50">
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
    <div className="relative z-50">
      <div className="flex lg:flex-col justify-between gap-2">
        {shopItems.map((item, index) => {
          if (item.type !== 'tower') return null
          const canAfford = gold >= item.basePrice
          return (
            <div
              key={item.tower._id}
              ref={el => {
                towerRefs.current[index] = el
              }}
              className="flex-shrink-0 active:scale-95 touch-none transition-transform relative w-fit"
              onMouseDown={handleMouseDown(index)}
            >
              <Tower tower={item.tower} showStats={true} />
              {/* Price badge moved outside tower stats to avoid conflict */}
              <div
                className={`absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  canAfford ? 'bg-yellow-400 text-yellow-900' : 'bg-red-500 text-white'
                } z-10 leading-none`}
              >
                {item.basePrice}
              </div>
              {!canAfford && (
                <div className="absolute inset-0 bg-black/50 rounded pointer-events-none" />
              )}
            </div>
          )
        })}
        <Button size={'icon'} onClick={generateTowers}>
          <Icon name="lucide:RefreshCw" />
        </Button>
      </div>
    </div>
  )
}
