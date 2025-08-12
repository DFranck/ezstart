'use client'

import { Button } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useGamesSocket } from '../../../../../contexts/GamesSocketContext'

type Props = {
  gameId: string
  isHost: boolean
  playerCount: number
}

export function StartGameButton({ gameId, isHost, playerCount }: Props) {
  const router = useRouter()
  const socket = useGamesSocket()
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startGame = async () => {
    try {
      setIsStarting(true)
      const response = await callApi(`/api/games/${gameId}/start`, {
        method: 'POST',
      })

      if (!response?.ok) {
        throw new Error('Game could not be started')
      }

      router.push(`/game/${gameId}`)
    } catch (err) {
      console.error('[games:start]', err)
      // Optionnel : affichage d'un toast ou d'un message
    } finally {
      cancelCountdown()
      setIsStarting(false)
    }
  }

  const initiateCountdown = () => {
    if (countdown !== null || isStarting) return // prevent double click
    
    setCountdown(5)
    
    // Notifier les autres joueurs du compte à rebours
    socket.emit('lobby:startCountdown', { gameId })

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
    clearTimeout(timeoutRef.current!)
    clearInterval(intervalRef.current!)
    setCountdown(null)
  }

  useEffect(() => {
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

    return () => {
      socket.off('lobby:playerLeft')
      socket.off('lobby:playerJoined')
      socket.off('lobby:countdownStarted')
      socket.off('lobby:countdownCancelled')
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
      <Button 
        onClick={initiateCountdown} 
        disabled={countdown !== null || isStarting || !canStart}
        className="w-full"
      >
        {countdown !== null 
          ? `Starting in ${countdown}s...` 
          : isStarting 
            ? 'Starting game...'
            : `Start Game (${playerCount}/${minPlayers} players)`
        }
      </Button>
      
      {!canStart && (
        <p className="text-sm text-orange-500 text-center">
          Need at least {minPlayers} players to start
        </p>
      )}
    </div>
  )
}
