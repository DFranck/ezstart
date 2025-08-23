'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { extractPlayerId } from '@/utils/extractPlayerId'
import { isDebug, logger } from '@ezstart/ui/lib'
import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { mockGames, type Game } from '@tower-defense/types'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseGamesOptions {
  autoRedirect?: boolean
  pollingInterval?: number
  enablePolling?: boolean
}

export function useGames(options: UseGamesOptions = {}) {
  const { autoRedirect = true, pollingInterval = 10000, enablePolling = true } = options

  const router = useRouter()
  const { player } = usePlayerStore()
  const { socket } = useGamesSocket()
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const [allGames, setAllGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Références pour éviter les re-renders inutiles
  const isInitialLoad = useRef(true)
  const lastFetchTime = useRef(0)
  const currentWaitingGames = useRef<Game[]>([])
  const currentAllGames = useRef<Game[]>([])

  // Fonction utilitaire pour comparer les jeux
  const gamesAreEqual = useCallback((games1: Game[], games2: Game[]) => {
    if (games1.length !== games2.length) return false

    return games1.every((game1, index) => {
      const game2 = games2[index]
      return (
        game1._id === game2._id &&
        game1.phase === game2.phase &&
        game1.players.length === game2.players.length
      )
    })
  }, [])

  // Fonction de fetch silencieuse pour le polling
  const fetchGamesSilent = useCallback(
    async (playerId?: string) => {
      try {
        if (isDebug()) {
          const games = mockGames
          const waitingGames = games.filter(game => game.phase === 'waiting')
          const playingGames = games.filter(game => game.phase === 'playing')

          // Mettre à jour seulement si les données ont changé
          if (!gamesAreEqual(currentAllGames.current, games)) {
            currentAllGames.current = games
            setAllGames(games)
          }

          if (!gamesAreEqual(currentWaitingGames.current, waitingGames)) {
            currentWaitingGames.current = waitingGames
            setWaitingGames(waitingGames)
          }

          // Vérifier si le joueur est dans une partie active
          if (autoRedirect && playerId) {
            const activeGame = playingGames.find(game =>
              game.players.some(inGamePlayer => inGamePlayer.player._id === playerId)
            )

            if (activeGame) {
              logger.debug('Redirecting to active game', activeGame._id)
              router.push(`/game/${activeGame._id}`)
            }
          }
          return games
        }

        const res = await callApi('/api/games?phase=waiting&phase=playing')
        if (!res.ok) {
          throw new Error('Failed to fetch games')
        }

        const games = res.data as Game[]
        const waitingGames = games.filter(game => game.phase === 'waiting')
        const playingGames = games.filter(game => game.phase === 'playing')

        // Mettre à jour seulement si les données ont changé
        if (!gamesAreEqual(currentAllGames.current, games)) {
          currentAllGames.current = games
          setAllGames(games)
        }

        if (!gamesAreEqual(currentWaitingGames.current, waitingGames)) {
          currentWaitingGames.current = waitingGames
          setWaitingGames(waitingGames)
        }

        logger.debug('playingGames', playingGames)
        logger.debug('waitingGames', waitingGames)
        logger.debug('Current player ID:', playerId)

        // Vérifier si le joueur est dans une partie active
        if (autoRedirect && playerId) {
          const activeGame = playingGames.find(game =>
            game.players.some(inGamePlayer => inGamePlayer.player._id === playerId)
          )

          if (activeGame) {
            logger.debug('Redirecting to active game', activeGame._id)
            router.push(`/game/${activeGame._id}`)
          }
        }

        return games
      } catch (error) {
        logger.error('Silent fetch failed:', error)
        // Ne pas déclencher d'erreur visible pour le polling silencieux
        return null
      }
    },
    [autoRedirect, router, gamesAreEqual]
  )

  // Fonction de fetch avec feedback pour le chargement initial
  const fetchGamesWithFeedback = useCallback(
    async (playerId?: string) => {
      return runWithFeedback({
        action: async () => {
          const games = await fetchGamesSilent(playerId)
          if (!games) {
            throw new Error('Failed to fetch games')
          }
          return games
        },
        toastLoading: { message: 'Loading games...' },
        toastSuccess: false,
        toastError: { message: 'Failed to load games' },
        onLoadingChange: setIsLoading,
        onError: err => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch games'
          setError(errorMessage)
        },
        onSuccess: () => {
          setError(null)
          isInitialLoad.current = false
        },
      })
    },
    [fetchGamesSilent]
  )

  // Polling automatique silencieux
  useEffect(() => {
    if (!enablePolling || isInitialLoad.current) return

    const interval = setInterval(async () => {
      // Éviter les requêtes trop fréquentes
      const now = Date.now()
      if (now - lastFetchTime.current < pollingInterval) return

      lastFetchTime.current = now
      // Passer le playerId du store au polling
      await fetchGamesSilent(player?._id)
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [fetchGamesSilent, enablePolling, pollingInterval, player?._id])

  // Chargement initial avec feedback
  const fetchGames = useCallback(
    async (playerId?: string) => {
      if (isInitialLoad.current) {
        return fetchGamesWithFeedback(playerId)
      } else {
        return fetchGamesSilent(playerId)
      }
    },
    [fetchGamesWithFeedback, fetchGamesSilent]
  )

  const refreshGames = useCallback(
    async (playerId?: string) => {
      // Force un refresh avec feedback
      isInitialLoad.current = true
      return fetchGamesWithFeedback(playerId)
    },
    [fetchGamesWithFeedback]
  )

  // Écouter les événements socket pour les mises à jour temps réel
  useEffect(() => {
    if (!socket) return

    // Nouvelle game créée
    const handleGameCreated = (newGame: Game) => {
      logger.debug('Game created via socket', newGame)
      if (newGame.phase === 'waiting') {
        setWaitingGames(prev => {
          const gameExists = prev.some(game => game._id === newGame._id)
          return gameExists ? prev : [...prev, newGame]
        })
      }
      setAllGames(prev => {
        const gameExists = prev.some(game => game._id === newGame._id)
        return gameExists ? prev : [...prev, newGame]
      })
    }

    // Game supprimée
    const handleGameDeleted = (data: { gameId: string }) => {
      logger.debug('Game deleted via socket', data.gameId)
      setWaitingGames(prev => prev.filter(game => game._id !== data.gameId))
      setAllGames(prev => prev.filter(game => game._id !== data.gameId))
    }

    // Game démarrée (la retirer des waiting games mais la garder pour la reconnexion)
    const handleGameStarted = (data: { gameId: string, game?: Game }) => {
      logger.debug('Game started via socket', data.gameId)
      setWaitingGames(prev => prev.filter(game => game._id !== data.gameId))
      
      // Si on a les données de la game, la marquer comme 'playing' dans allGames
      if (data.game) {
        setAllGames(prev => prev.map(game => 
          game._id === data.gameId 
            ? { ...game, phase: 'playing' }
            : game
        ))
      }
      
      // Vérifier si le joueur était dans cette game pour le rediriger
      if (autoRedirect && player?._id) {
        const gameToCheck = data.game || allGames.find(g => g._id === data.gameId)
        if (gameToCheck?.players.some(inGamePlayer => inGamePlayer.player._id === player._id)) {
          router.push(`/game/${data.gameId}`)
        }
      }
    }

    // Game terminée
    const handleGameEnded = (data: { gameId: string }) => {
      logger.debug('Game ended via socket', data.gameId)
      setWaitingGames(prev => prev.filter(game => game._id !== data.gameId))
      setAllGames(prev => prev.filter(game => game._id !== data.gameId))
    }

    socket.on('gameCreated', handleGameCreated)
    socket.on('gameDeleted', handleGameDeleted)
    socket.on('gameStarted', handleGameStarted)
    socket.on('lobby:gameStarted', handleGameStarted)
    socket.on('gameEnded', handleGameEnded)

    return () => {
      socket.off('gameCreated', handleGameCreated)
      socket.off('gameDeleted', handleGameDeleted)  
      socket.off('gameStarted', handleGameStarted)
      socket.off('lobby:gameStarted', handleGameStarted)
      socket.off('gameEnded', handleGameEnded)
    }
  }, [socket, player?._id, router, autoRedirect, allGames])

  return {
    waitingGames,
    allGames,
    isLoading,
    error,
    fetchGames,
    refreshGames,
    setError,
  }
}
