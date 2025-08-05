'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import type { Game, GameAction } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { GameContext } from '../contexts/GameContext'

export function GameProvider({ gameId, children }: { gameId: string; children: React.ReactNode }) {
  const socket = useGamesSocket()
  const [game, setGame] = useState<Game | null>(null)

  useEffect(() => {
    socket.on('gameState', (state: Game) => {
      setGame(state)
    })

    socket.on('actionRejected', ({ reason }) => {
      console.warn('[actionRejected]', reason)
      toast.error(`Action rejected: ${reason}`)
    })

    return () => {
      socket.off('gameState')
      socket.off('actionRejected')
    }
  }, [gameId])

  return (
    <GameContext.Provider
      value={{
        game,
        sendAction: (action: GameAction) => socket.emit('gameAction', { gameId, action }),
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
