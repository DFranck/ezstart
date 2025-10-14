'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, Div, H6, Icon } from '@ezstart/ui/components'
import { calculateUnitPrice, ELEMENTAL_COLORS, type ElementalType } from '@tower-defense/config'
import type { Game, ShopItem, MobType } from '@tower-defense/types'
import { ENTITY_MOB_TYPES } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { RtsButton } from './RtsButton'

type Props = {
  game: Game
}

export function MobShop({ game }: Props) {
  const { game: currentGame, sendAction } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)
  const { toSendMobs } = useGameState()
  const gold = useGameState(s => s.gold)
  const spendGold = useGameState(s => s.spendGold)
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [isClient, setIsClient] = useState(false)

  // Generate random mobs from shared config
  const generateMobs = () => {
    const items: ShopItem[] = []
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * ENTITY_MOB_TYPES.length)
      const mob = ENTITY_MOB_TYPES[randomIndex]!
      items.push({
        type: 'unit' as const,
        basePrice: calculateUnitPrice(mob),
        unit: mob,
      })
    }
    setShopItems(items)
  }

  useEffect(() => {
    setIsClient(true)
    generateMobs()
  }, [])

  const handleBuyMob = (item: ShopItem) => {
    if (item.type !== 'unit') return

    // Check if player has enough gold
    if (gold < item.basePrice) {
      console.log('[MobShop] Not enough gold:', gold, '<', item.basePrice)
      return
    }

    if (!currentPlayer || !currentGame) {
      console.warn('[MobShop] Missing currentPlayer or currentGame')
      return
    }

    // Optimistic UI: déduire le gold localement immédiatement pour éviter le lag visuel
    spendGold(item.basePrice)

    // En mode solo, envoyer les mobs sur soi-même
    if (currentGame.isSoloMode) {
      sendAction({
        type: 'spawnMob',
        payload: {
          mobType: item.unit,
          targetPlayerId: currentPlayer._id,
          fromPlayerId: currentPlayer._id,
        },
      })
      return
    }

    // Mode multi : envoyer aux adversaires
    const opponents =
      currentGame.players?.filter(p => p.player?._id && p.player._id !== currentPlayer._id) || []

    opponents.forEach(opponent => {
      if (opponent.player?._id) {
        sendAction({
          type: 'spawnMob',
          payload: {
            mobType: item.unit,
            targetPlayerId: opponent.player._id,
            fromPlayerId: currentPlayer._id,
          },
        })
      }
    })
  }

  if (!isClient) {
    return (
      <Div layout="col" className="z-50 gap-4 p-4 bg-muted rounded-xl">
        <H6>Mobs à acheter</H6>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </Div>
    )
  }

  return (
    <Div className="z-50">
      <Div layout="row" className="gap-2 flex-wrap">
        {shopItems.map((item, index) => {
          if (item.type !== 'unit') return null
          const mobColor = ELEMENTAL_COLORS[item.unit.elementalType as ElementalType] || '#888'
          const canAfford = gold >= item.basePrice
          return (
            <div key={`mob-shop-${index}`} className="relative group">
              <RtsButton
                onClick={() => handleBuyMob(item)}
                disabled={!canAfford}
                cooldown={500}
                icon="lucide:Ghost"
                style={{ backgroundColor: mobColor }}
                className="h-14 w-14"
              />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {item.unit.name}
              </span>

              {/* Price badge (top-right) */}
              <div
                className={`absolute -top-1 -right-1 px-1 py-0.5 rounded-sm text-[10px] font-bold leading-none ${
                  canAfford ? 'bg-yellow-400 text-yellow-900' : 'bg-red-500 text-white'
                }`}
              >
                {item.basePrice}
              </div>

              {/* HP badge (top-left) - only number */}
              <div className="absolute -top-1 -left-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-red-500/90 text-white leading-none">
                {item.unit.hp}
              </div>

              {/* Damage badge (bottom-left) - only number */}
              <div className="absolute -bottom-1 -left-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-orange-500/90 text-white leading-none">
                {item.unit.damage}
              </div>

              {/* Speed badge (bottom-right) - only number */}
              <div className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-blue-500/90 text-white leading-none">
                {item.unit.speed}
              </div>

              {/* Special icons - smaller */}
              {item.unit.canFly && (
                <div className="absolute top-0 left-0">
                  <Icon name="lucide:Wind" className="w-2.5 h-2.5 text-cyan-400" />
                </div>
              )}
              {item.unit.attackRange > 0 && (
                <div className="absolute bottom-0 right-0">
                  <Icon name="lucide:Target" className="w-2.5 h-2.5 text-purple-400" />
                </div>
              )}

              {!canAfford && (
                <div className="absolute inset-0 bg-black/50 rounded pointer-events-none" />
              )}
            </div>
          )
        })}
        <Button size={'icon'} onClick={generateMobs}>
          <Icon name="lucide:RefreshCw" />
        </Button>
      </Div>

      {toSendMobs.length > 0 && (
        <Div className="mt-4">
          <H6>Mobs en attente</H6>
          <ul className="text-sm list-disc pl-4">
            {toSendMobs.map((mob, i) => (
              <li key={i}>{mob.name}</li>
            ))}
          </ul>
        </Div>
      )}
    </Div>
  )
}
