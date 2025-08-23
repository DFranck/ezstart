'use client'

import { useGameState } from '@/stores/useGameState'
import { Button, Div, H6 } from '@ezstart/ui/components'
import { Game, mockMobs } from '@tower-defense/types'
import { useEffect, useState } from 'react'

type Props = {
  game: Game
}

export function MobShop({ game }: Props) {
  const { addMobToSend, toSendMobs } = useGameState()
  const [mobs, setMobs] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setMobs(mockMobs)
  }, [])

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
            <Button size="sm" onClick={() => addMobToSend(mob)} className="mt-1">
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
