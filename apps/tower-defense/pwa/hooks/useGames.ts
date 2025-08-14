'use client'

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
              game.players.some(p => extractPlayerId(p) === playerId)
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
            game.players.some(p => extractPlayerId(p) === playerId)
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
      await fetchGamesSilent()
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [fetchGamesSilent, enablePolling, pollingInterval])

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
