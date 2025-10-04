'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, Div, H6, Icon } from '@ezstart/ui/components'
import { ELEMENTAL_COLORS, type ElementalType } from '@tower-defense/config'
import { Game, mockMobs } from '@tower-defense/types'
import { useEffect, useState } from 'react'

type Props = {
  game: Game
}

export function MobShop({ game }: Props) {
  const { game: currentGame, sendAction } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)
  const { toSendMobs } = useGameState()
  const [mobs, setMobs] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setMobs(mockMobs(5))
  }, [])

  const handleBuyMob = (mob: any) => {
    console.log('[MobShop] Buy mob clicked:', mob)
    console.log('[MobShop] Current player:', currentPlayer)
    console.log('[MobShop] Current game:', currentGame)
    console.log('[MobShop] Is solo mode:', currentGame?.isSoloMode)

    if (!currentPlayer || !currentGame) {
      console.warn('[MobShop] Missing currentPlayer or currentGame')
      return
    }

    // En mode solo, envoyer les mobs sur soi-même
    if (currentGame.isSoloMode) {
      console.log('[MobShop] Solo mode - spawning mob on self')
      sendAction({
        type: 'spawnMob',
        payload: {
          mobType: mob,
          targetPlayerId: currentPlayer._id, // Spawn sur soi en solo
          fromPlayerId: currentPlayer._id,
        },
      })
      return
    }

    // Mode multi : envoyer aux adversaires
    const opponents =
      currentGame.players?.filter(p => p.player?._id && p.player._id !== currentPlayer._id) || []

    console.log('[MobShop] Multi mode - found opponents:', opponents.length)

    opponents.forEach(opponent => {
      if (opponent.player?._id) {
        console.log('[MobShop] Sending mob to opponent:', opponent.player._id)
        sendAction({
          type: 'spawnMob',
          payload: {
            mobType: mob,
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
        {mobs.map(mob => {
          const mobColor = ELEMENTAL_COLORS[mob.elementalType as ElementalType] || '#888'
          return (
            <Button
              size="icon"
              key={mob._id}
              onClick={() => handleBuyMob(mob)}
              onTouchEnd={e => {
                e.preventDefault()
                e.stopPropagation()
                handleBuyMob(mob)
              }}
              style={{ backgroundColor: mobColor }}
              className="relative group"
            >
              <Icon name="lucide:Ghost" className="text-white" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {mob.name}
              </span>
            </Button>
          )
        })}
        <Button size={'icon'} onClick={() => setMobs(mockMobs(5))}>
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
