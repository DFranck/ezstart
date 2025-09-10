'use client'

import type { Game, GameAction } from '@tower-defense/types'
import { createContext, useContext } from 'react'

type GameContextType = {
  game: Game | null
  sendAction: (action: GameAction) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return ctx
}

export { GameContext }
