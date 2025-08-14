'use client'

import { useGamesSocketInstance } from '@/contexts/GamesSocketContext'
import type { Game, GameAction } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { GameContext } from '../contexts/GameContext'

export function GameProvider({ gameId, children }: { gameId: string; children: React.ReactNode }) {
  const socket = useGamesSocketInstance()
  const [game, setGame] = useState<Game | null>(null)

  useEffect(() => {
    // Rejoindre la room du jeu
    socket.emit('game:join', { gameId })

    socket.on('gameState', (state: Game) => {
      setGame(state)
    })

    socket.on('actionRejected', ({ reason }) => {
      console.warn('[actionRejected]', reason)
      toast.error(`Action rejected: ${reason}`)
    })

    return () => {
      // Quitter la room du jeu
      socket.emit('game:leave', { gameId })
      socket.off('gameState')
      socket.off('actionRejected')
    }
  }, [socket, gameId])

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
