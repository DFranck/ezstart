'use client'

import { Div } from '@ezstart/ui/components'
import { Game } from '@tower-defense/types'
import { useEffect, useState } from 'react'

interface GameTimerProps {
  game: Game
}

export function GameTimer({ game }: GameTimerProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00')

  useEffect(() => {
    if (!game?.startedAt) return

    const updateTimer = () => {
      if (!game.startedAt) return
      const startTime = new Date(game.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)

      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60

      setElapsedTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [game?.startedAt])

  if (!game || game.phase !== 'playing') {
    return null
  }

  return (
    <Div size={'xs'} className="z-50 bg-background rounded-md font-mono text-sm w-fit">
      {elapsedTime}
    </Div>
  )
}
