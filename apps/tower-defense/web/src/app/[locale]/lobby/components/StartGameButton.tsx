'use client'

import { useGamesSocketInstance } from '@/contexts/GamesSocketContext'
import { Button } from '@ezstart/ui/components'
import { callApi } from '@/utils/api'
import type { InGamePlayer } from '@tower-defense/types'
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
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set())
  const [showReadyCheck, setShowReadyCheck] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [activePlayerCount, setActivePlayerCount] = useState(playerCount)
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

  const initiateReadyCheck = () => {
    console.log('[StartGameButton] Initiating ready check:', { gameId, playerId: currentUserId })
    setShowReadyCheck(true)
    setReadyPlayers(new Set())
    setIsReady(false)
    setError(null)
    
    // Notifier les autres joueurs du ready check
    if (currentUserId && socketConnected) {
      console.log('[StartGameButton] Emitting lobby:startReadyCheck')
      socket.emit('lobby:startReadyCheck', { gameId, playerId: currentUserId })
    } else {
      console.warn('[StartGameButton] Cannot emit ready check - missing userId or socket disconnected')
    }
  }

  const toggleReady = () => {
    if (!currentUserId) return
    
    const newReadyState = !isReady
    setIsReady(newReadyState)
    
    if (socketConnected) {
      socket.emit('lobby:playerReady', { 
        gameId, 
        playerId: currentUserId, 
        ready: newReadyState 
      })
    }
  }

  const cancelReadyCheck = () => {
    setShowReadyCheck(false)
    setReadyPlayers(new Set())
    setIsReady(false)
    
    if (currentUserId && socketConnected) {
      socket.emit('lobby:cancelReadyCheck', { gameId, playerId: currentUserId })
    }
  }

  const initiateCountdown = () => {
    if (countdown !== null || isStarting) return // prevent double click

    console.log('[StartGameButton] Initiating countdown')
    setError(null)

    // Notifier TOUS les joueurs (y compris l'host) du compte à rebours
    if (currentUserId && socketConnected) {
      socket.emit('lobby:startCountdown', { gameId, playerId: currentUserId })
    }
  }

  const cancelCountdown = () => {
    // Éviter les appels multiples
    if (countdown === null) return

    console.log('[StartGameButton] Cancelling countdown')
    clearTimeout(timeoutRef.current!)
    clearInterval(intervalRef.current!)
    setCountdown(null)

    // Notifier TOUS les joueurs de l'annulation
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

    // S'assurer qu'on est dans la room lobby pour recevoir les événements
    if (currentUserId && socket.connected) {
      socket.emit('lobby:join', { gameId, playerId: currentUserId })
    }

    // Écouter les événements de connexion
    socket.on('connect', () => {
      checkSocketConnection()
      if (currentUserId) {
        socket.emit('lobby:join', { gameId, playerId: currentUserId })
      }
    })
    socket.on('disconnect', checkSocketConnection)

    // Écouter les événements de lobby et mettre à jour le compteur de joueurs
    socket.on('lobby:playersUpdated', (players: InGamePlayer[]) => {
      const activePlayers = players.filter(p => p.status === 'active')
      setActivePlayerCount(activePlayers.length)
      console.log('[StartGameButton] Active players updated:', activePlayers.length)
    })
    
    socket.on('lobby:playerLeft', () => {
      cancelCountdown()
      cancelReadyCheck()
    })
    socket.on('lobby:playerJoined', () => {
      cancelCountdown()
      cancelReadyCheck()
    })
    
    // Ready check events
    socket.on('lobby:readyCheckStarted', () => {
      console.log('[StartGameButton] Ready check started received')
      setShowReadyCheck(true)
      setReadyPlayers(new Set())
      setIsReady(false)
    })
    socket.on('lobby:readyCheckCancelled', () => {
      console.log('[StartGameButton] Ready check cancelled received')
      setShowReadyCheck(false)
      setReadyPlayers(new Set())
      setIsReady(false)
    })
    socket.on('lobby:playerReadyUpdate', ({ playerId, ready, readyPlayerIds }: {
      playerId: string
      ready: boolean
      readyPlayerIds: string[]
    }) => {
      console.log('[StartGameButton] Player ready update received:', { playerId, ready, readyPlayerIds })
      setReadyPlayers(new Set(readyPlayerIds))
    })
    
    // Countdown events
    socket.on('lobby:countdownStarted', () => {
      console.log('[StartGameButton] Countdown started event received')
      if (countdown === null) {
        setShowReadyCheck(false) // Hide ready check when countdown starts
        setCountdown(10)
        
        // Clear any existing intervals/timeouts
        clearInterval(intervalRef.current!)
        clearTimeout(timeoutRef.current!)
        
        intervalRef.current = setInterval(() => {
          setCountdown(prev => {
            console.log('[StartGameButton] Countdown tick:', prev)
            if (prev === null) return null
            if (prev <= 1) {
              console.log('[StartGameButton] Countdown ending')
              clearInterval(intervalRef.current!)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
        // Timeout pour lancer le jeu automatiquement
        timeoutRef.current = setTimeout(() => {
          console.log('[StartGameButton] Countdown timeout reached, starting game')
          clearInterval(intervalRef.current!)
          setCountdown(null)
          if (isHost) {
            startGame()
          }
        }, 10000)
      }
    })
    socket.on('lobby:countdownCancelled', () => {
      console.log('[StartGameButton] Countdown cancelled event received')
      clearTimeout(timeoutRef.current!)
      clearInterval(intervalRef.current!)
      setCountdown(null)
    })

    // Écouter le démarrage du jeu
    socket.on('lobby:gameStarted', ({ gameId: startedGameId }: { gameId: string }) => {
      console.log('[StartGameButton] Game started, redirecting to game page')
      if (startedGameId === gameId) {
        router.push(`/game/${gameId}`)
      }
    })

    // Écouter les erreurs
    socket.on('error', (errorData: { message: string }) => {
      setError(errorData.message)
      cancelCountdown()
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('lobby:playersUpdated')
      socket.off('lobby:playerLeft')
      socket.off('lobby:playerJoined')
      socket.off('lobby:readyCheckStarted')
      socket.off('lobby:readyCheckCancelled')
      socket.off('lobby:playerReadyUpdate')
      socket.off('lobby:countdownStarted')
      socket.off('lobby:countdownCancelled')
      socket.off('lobby:gameStarted')
      socket.off('error')
      clearTimeout(timeoutRef.current!)
      clearInterval(intervalRef.current!)
    }
  }, [socket, gameId, currentUserId])

  // Seul le host peut démarrer la partie
  if (!isHost) {
    return (
      <div className="mt-4 space-y-2">
        {countdown !== null ? (
          <div className="p-4 bg-orange-100 border border-orange-400 rounded text-center">
            <p className="text-lg font-bold text-orange-700">Starting in {countdown}s...</p>
            <p className="text-sm text-orange-600">Get ready! Game will begin automatically</p>
          </div>
        ) : showReadyCheck ? (
          <div className="space-y-2">
            <div className="p-3 bg-blue-100 border border-blue-400 rounded text-center">
              <p className="text-sm font-semibold text-blue-700 mb-2">Ready Check</p>
              <p className="text-xs text-blue-600">
                {readyPlayers.size} / {activePlayerCount} players ready
              </p>
            </div>
            <Button
              onClick={toggleReady}
              className={`w-full ${
                isReady 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {isReady ? '✓ Ready' : 'Ready?'}
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Waiting for host to start the game...
            </p>
          </div>
        )}
      </div>
    )
  }

  const minPlayers = 2 // Minimum de joueurs requis
  const canStart = activePlayerCount >= minPlayers
  const isSolo = activePlayerCount === 1
  const allReady = readyPlayers.size === activePlayerCount && canStart

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

      {countdown !== null ? (
        <div className="space-y-2">
          <div className="p-4 bg-orange-100 border border-orange-400 rounded text-center">
            <p className="text-lg font-bold text-orange-700">Starting in {countdown}s...</p>
            <p className="text-sm text-orange-600">Game will begin automatically</p>
          </div>
          <Button
            onClick={cancelCountdown}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
          >
            Cancel Start
          </Button>
        </div>
      ) : showReadyCheck ? (
        <div className="space-y-2">
          <div className="p-3 bg-blue-100 border border-blue-400 rounded text-center">
            <p className="text-sm font-semibold text-blue-700 mb-1">Ready Check</p>
            <p className="text-xs text-blue-600 mb-2">
              {readyPlayers.size} / {activePlayerCount} players ready
            </p>
            {allReady && (
              <p className="text-xs text-green-600 font-medium">✓ All players ready!</p>
            )}
          </div>
          <div className="space-y-2">
            <Button
              onClick={toggleReady}
              className={`w-full ${
                isReady 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {isReady ? '✓ Ready' : 'Ready?'}
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={initiateCountdown}
                disabled={!allReady}
                className="flex-1"
              >
                {allReady ? 'Start Game' : 'Waiting for players...'}
              </Button>
              <Button
                onClick={cancelReadyCheck}
                variant="outline"
                className="px-3 border-red-300 text-red-600 hover:bg-red-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {isSolo ? (
            // Mode solo - bouton unique pour démarrer seul
            <div className="space-y-2">
              <Button
                onClick={startGame}
                disabled={isStarting}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                {isStarting ? 'Starting Solo Mode...' : '🎮 Start Solo Mode'}
              </Button>
              <p className="text-xs text-purple-600 text-center">
                Play alone - mobs will spawn on your board
              </p>
            </div>
          ) : (
            // Mode multi - boutons ready check et quick start
            <>
              <Button
                onClick={initiateReadyCheck}
                disabled={!canStart}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Ready Check ({activePlayerCount}/{minPlayers} players)
              </Button>
              <Button
                onClick={initiateCountdown}
                disabled={!canStart}
                variant="outline"
                className="w-full"
              >
                Quick Start (Skip ready check)
              </Button>
            </>
          )}
        </div>
      )}

      {!canStart && !isSolo && (
        <p className="text-sm text-orange-500 text-center">
          Need at least {minPlayers} players to start ({activePlayerCount} active)
        </p>
      )}
    </div>
  )
}
