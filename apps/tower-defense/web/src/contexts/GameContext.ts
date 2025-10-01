'use client'

import type { Game, GameAction } from '@tower-defense/types'
import { createContext, useContext } from 'react'
import type { Socket } from 'socket.io-client'

type GameContextType = {
  game: Game | null
  sendAction: (action: GameAction) => void
  socket: Socket | null
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
