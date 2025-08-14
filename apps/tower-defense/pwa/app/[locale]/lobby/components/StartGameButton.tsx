'use client'

import { useGamesSocketInstance } from '@/contexts/GamesSocketContext'
import { Button } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useNetworkRetry } from '../../../../hooks/useNetworkRetry'

type Props = {
  gameId: string
  isHost: boolean
  playerCount: number
  currentUserId?: string
}

export function StartGameButton({ gameId, isHost, playerCount, currentUserId }: Props) {
  const router = useRouter()
  const socket = useGamesSocketInstance()
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socketConnected, setSocketConnected] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { executeWithRetry, isRetrying, retryCount } = useNetworkRetry({
    maxRetries: 3,
    delay: 1000,
    backoff: 2,
  })

  const startGame = async () => {
    try {
      setIsStarting(true)
      setError(null)

      const response = await executeWithRetry(() =>
        callApi(`/api/games/${gameId}/start`, { method: 'POST' })
      )

      if (!response?.ok) {
        throw new Error('Game could not be started')
      }

      router.push(`/game/${gameId}`)
    } catch (err) {
      console.error('[games:start]', err)
      setError('Failed to start game. Please try again.')
    } finally {
      cancelCountdown()
      setIsStarting(false)
    }
  }

  const initiateCountdown = () => {
    if (countdown !== null || isStarting) return // prevent double click

    setCountdown(5)
    setError(null)

    // Notifier les autres joueurs du compte à rebours
    if (currentUserId && socketConnected) {
      socket.emit('lobby:startCountdown', { gameId, playerId: currentUserId })
    }

    intervalRef.current = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)

    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      setCountdown(null)
      startGame()
    }, 5000)
  }

  const cancelCountdown = () => {
    // Éviter les appels multiples
    if (countdown === null) return

    clearTimeout(timeoutRef.current!)
    clearInterval(intervalRef.current!)
    setCountdown(null)

    // Notifier les autres joueurs de l'annulation
    if (currentUserId && socketConnected) {
      socket.emit('lobby:cancelCountdown', { gameId, playerId: currentUserId })
    }
  }

  useEffect(() => {
    // Vérifier la connexion Socket.IO
    const checkSocketConnection = () => {
      setSocketConnected(socket.connected)
    }

    checkSocketConnection()

    // Écouter les événements de connexion
    socket.on('connect', checkSocketConnection)
    socket.on('disconnect', checkSocketConnection)

    // Écouter les événements de lobby
    socket.on('lobby:playerLeft', cancelCountdown)
    socket.on('lobby:playerJoined', cancelCountdown)
    socket.on('lobby:countdownStarted', () => {
      if (countdown === null) {
        setCountdown(5)
        intervalRef.current = setInterval(() => {
          setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
        }, 1000)
      }
    })
    socket.on('lobby:countdownCancelled', cancelCountdown)

    // Écouter les erreurs
    socket.on('error', (errorData: { message: string }) => {
      setError(errorData.message)
      cancelCountdown()
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('lobby:playerLeft')
      socket.off('lobby:playerJoined')
      socket.off('lobby:countdownStarted')
      socket.off('lobby:countdownCancelled')
      socket.off('error')
      clearTimeout(timeoutRef.current!)
      clearInterval(intervalRef.current!)
    }
  }, [socket, countdown])

  // Seul le host peut démarrer la partie
  if (!isHost) {
    return (
      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Waiting for host to start the game...
        </p>
        {countdown !== null && (
          <p className="text-lg font-bold mt-2">Starting in {countdown}s...</p>
        )}
      </div>
    )
  }

  const minPlayers = 2 // Minimum de joueurs requis
  const canStart = playerCount >= minPlayers

  return (
    <div className="mt-4 space-y-2">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      )}

      {!socketConnected && (
        <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          ⚠️ Connection lost. Some features may not work properly.
        </div>
      )}

      <Button
        onClick={initiateCountdown}
        disabled={countdown !== null || isStarting || isRetrying || !canStart}
        className="w-full"
      >
        {countdown !== null
          ? `Starting in ${countdown}s...`
          : isStarting || isRetrying
            ? `Starting game...${isRetrying ? ` (Retry ${retryCount + 1}/3)` : ''}`
            : `Start Game (${playerCount}/${minPlayers} players)`}
      </Button>

      {!canStart && (
        <p className="text-sm text-orange-500 text-center">
          Need at least {minPlayers} players to start
        </p>
      )}
    </div>
  )
}
