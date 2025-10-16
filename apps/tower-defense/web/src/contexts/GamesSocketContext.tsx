'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getApiUrl } from '@ezstart/config/urls'

interface GamesSocketContextType {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
}

const GamesSocketContext = createContext<GamesSocketContextType | null>(null)

export function GamesSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = () => {
    if (socket?.connected) return

    const apiUrl = getApiUrl('tower-defense')
    const newSocket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    newSocket.on('connect', () => {
      console.log('[GamesSocket] Connected')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('[GamesSocket] Disconnected')
      setIsConnected(false)
    })

    newSocket.on('error', error => {
      // Ignorer les erreurs vides qui ne sont pas utiles
      if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
        console.debug('[GamesSocket] Empty error received (ignored)')
        return
      }

      // Log seulement les vraies erreurs avec du contenu
      console.error('[GamesSocket] Error:', error)
    })

    setSocket(newSocket)
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  return (
    <GamesSocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </GamesSocketContext.Provider>
  )
}

export function useGamesSocket() {
  const context = useContext(GamesSocketContext)
  if (!context) {
    throw new Error('useGamesSocket must be used within a GamesSocketProvider')
  }
  return context
}

export function useGamesSocketInstance(): Socket {
  const context = useGamesSocket()
  if (!context.socket) {
    throw new Error('Socket not initialized')
  }
  return context.socket
}
