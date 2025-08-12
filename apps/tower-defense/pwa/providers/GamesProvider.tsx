'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import { JoinGameResponse } from '@tower-defense/types'
import { useEffect } from 'react'

export function GamesProvider({ children }: { children: React.ReactNode }) {
  try {
    const socket = useGamesSocket()

    useEffect(() => {
      if (socket) {
        socket.on('playerJoined', (data: JoinGameResponse) => {
          console.log('[socket] playerJoined', data)
        })

        return () => {
          socket.off('playerJoined')
        }
      }
    }, [socket])

    return children
  } catch (error) {
    console.error('[GamesProvider] Error:', error)
    return children
  }
}
