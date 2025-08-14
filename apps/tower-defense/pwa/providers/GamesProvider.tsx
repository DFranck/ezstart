'use client'

import { useGamesSocketInstance } from '@/contexts/GamesSocketContext'
import { JoinGameResponse } from '@tower-defense/types'
import { useEffect } from 'react'

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const socket = useGamesSocketInstance()

  useEffect(() => {
    // Événements globaux des jeux
    socket.on('playerJoined', (data: JoinGameResponse) => {
      console.log('[GamesProvider] playerJoined', data)
    })

    socket.on('gameCreated', (data: any) => {
      console.log('[GamesProvider] gameCreated', data)
    })

    socket.on('gameDeleted', (data: any) => {
      console.log('[GamesProvider] gameDeleted', data)
    })

    return () => {
      socket.off('playerJoined')
      socket.off('gameCreated')
      socket.off('gameDeleted')
    }
  }, [socket])

  return children
}
