'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import type { Game } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { GameContext } from '../contexts/GameContext'

export function GameProvider({ gameId, children }: { gameId: string; children: React.ReactNode }) {
  const socket = useGamesSocket()
  const [game, setGame] = useState<Game | null>(null)

  useEffect(() => {
    socket.emit('joinGame', gameId)

    socket.on('gameState', (state: Game) => {
      setGame(state)
    })

    return () => {
      socket.emit('leaveGame', gameId)
      socket.off('gameState')
    }
  }, [gameId])

  return (
    <GameContext.Provider
      value={{
        game,
        sendAction: action => socket.emit('gameAction', { gameId, action }),
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
