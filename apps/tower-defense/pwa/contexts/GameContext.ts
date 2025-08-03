'use client'

import type { Game } from '@tower-defense/types'
import { createContext, useContext } from 'react'

type GameContextType = {
  game: Game | null
  sendAction: (action: any) => void
}

export const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
