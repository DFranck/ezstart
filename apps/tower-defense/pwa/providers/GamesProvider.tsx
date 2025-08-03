'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import { JoinGameResponse } from '@tower-defense/types'
import { useEffect } from 'react'

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const socket = useGamesSocket()

  useEffect(() => {
    socket.on('playerJoined', (data: JoinGameResponse) => {
      console.log('[socket] playerJoined', data)
    })

    return () => {
      socket.off('playerJoined')
    }
  }, [socket])

  return children
}
