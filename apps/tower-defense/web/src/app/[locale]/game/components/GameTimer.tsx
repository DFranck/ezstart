'use client'

import { Div, Icon } from '@ezstart/ui/components'
import { INCOME_INTERVAL_SECONDS, BASE_INCOME, calculateTotalIncome } from '@tower-defense/config'
import { Game } from '@tower-defense/types'
import { useEffect, useState } from 'react'

interface GameTimerProps {
  game: Game
}

export function GameTimer({ game }: GameTimerProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00')
  const [nextIncomeIn, setNextIncomeIn] = useState(INCOME_INTERVAL_SECONDS)
  const [currentTier, setCurrentTier] = useState(1)
  const [totalIncome, setTotalIncome] = useState(BASE_INCOME)

  // Update tier and income when game state changes
  useEffect(() => {
    const currentPlayer = game.players[0] // TODO: Get actual current player
    if (currentPlayer) {
      const tier = currentPlayer.tier || 1
      const income = calculateTotalIncome(BASE_INCOME, tier)
      setCurrentTier(tier)
      setTotalIncome(income)
    }
  }, [game.players])

  useEffect(() => {
    const startedAt = game?.startedAt
    if (!startedAt) return

    const updateTimer = () => {
      const startTime = new Date(startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)

      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60

      setElapsedTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )

      // Calculate next income countdown
      const secondsSinceLastIncome = elapsed % INCOME_INTERVAL_SECONDS
      const secondsUntilNextIncome = INCOME_INTERVAL_SECONDS - secondsSinceLastIncome
      setNextIncomeIn(secondsUntilNextIncome)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [game?.startedAt])

  if (!game || game.phase !== 'playing') {
    return null
  }

  return (
    <Div layout="col" size={'xs'} className="z-50 bg-background rounded-md font-mono text-xs w-fit gap-0">
      <Div layout="row" className="items-center gap-1">
        <Icon name="lucide:Clock" className="w-3 h-3" />
        <span className="text-sm">{elapsedTime}</span>
      </Div>
      <Div layout="row" className="items-center gap-1 text-muted-foreground">
        <Icon name="lucide:Coins" className="w-3 h-3 text-yellow-500" />
        <span>+{totalIncome}g in {nextIncomeIn}s</span>
      </Div>
      <Div layout="row" className="items-center gap-1 text-muted-foreground">
        <Icon name="lucide:Trophy" className="w-3 h-3 text-purple-500" />
        <span>Tier {currentTier}</span>
      </Div>
    </Div>
  )
}
