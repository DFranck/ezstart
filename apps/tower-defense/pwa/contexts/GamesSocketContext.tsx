'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

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

    const newSocket = io(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888', {
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

export function useGamesSocketInstance() {
  const context = useGamesSocket()
  if (!context.socket) {
    throw new Error('Socket not initialized')
  }
  return context.socket
}
