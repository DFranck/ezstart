'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, Div, H6 } from '@ezstart/ui/components'
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
    setMobs(mockMobs)
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
    const opponents = currentGame.players?.filter(p =>
      p.player?._id && p.player._id !== currentPlayer._id
    ) || []

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
      <Div layout="col" className="gap-4 p-4 bg-muted rounded-xl">
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
    <Div layout="col" className="gap-4 p-4 bg-muted rounded-xl">
      <H6>Mobs à acheter</H6>
      <Div layout="row" className="gap-2 flex-wrap">
        {mobs.map(mob => (
          <Div key={mob._id} variant="card" layout="col" className="p-2 w-32">
            {/* <img src={mob.imageUrl} alt={mob.name} className="w-12 h-12 mx-auto" /> */}
            <span className="text-sm text-center">{mob.name}</span>
            {/* <span className="text-xs text-center">💰 {mob.reward}</span> */}
            <Button size="sm" onClick={() => handleBuyMob(mob)} className="mt-1">
              Buy
            </Button>
          </Div>
        ))}
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
