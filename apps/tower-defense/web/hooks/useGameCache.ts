'use client'

import { useState, useCallback, useRef } from 'react'
import { Game } from '@tower-defense/types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface GameCache {
  games: CacheEntry<Game[]>
  individualGames: Map<string, CacheEntry<Game>>
}

export function useGameCache(ttl = 30000) { // 30 secondes par défaut
  const [cache, setCache] = useState<GameCache>({
    games: { data: [], timestamp: 0, ttl },
    individualGames: new Map()
  })

  const isExpired = useCallback((entry: CacheEntry<any>) => {
    return Date.now() - entry.timestamp > entry.ttl
  }, [])

  const getGames = useCallback(() => {
    const entry = cache.games
    if (!isExpired(entry)) {
      return entry.data
    }
    return null
  }, [cache.games, isExpired])

  const setGames = useCallback((games: Game[]) => {
    setCache(prev => ({
      ...prev,
      games: {
        data: games,
        timestamp: Date.now(),
        ttl
      }
    }))
  }, [ttl])

  const getGame = useCallback((gameId: string) => {
    const entry = cache.individualGames.get(gameId)
    if (entry && !isExpired(entry)) {
      return entry.data
    }
    return null
  }, [cache.individualGames, isExpired])

  const setGame = useCallback((game: Game) => {
    setCache(prev => {
      const newIndividualGames = new Map(prev.individualGames)
      newIndividualGames.set(game._id, {
        data: game,
        timestamp: Date.now(),
        ttl
      })
      return {
        ...prev,
        individualGames: newIndividualGames
      }
    })
  }, [ttl])

  const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    setCache(prev => {
      const newIndividualGames = new Map(prev.individualGames)
      const existingEntry = newIndividualGames.get(gameId)
      
      if (existingEntry) {
        newIndividualGames.set(gameId, {
          data: { ...existingEntry.data, ...updates },
          timestamp: Date.now(),
          ttl
        })
      }

      // Mettre à jour aussi dans la liste des jeux
      const updatedGames = prev.games.data.map(game => 
        game._id === gameId ? { ...game, ...updates } : game
      )

      return {
        games: {
          data: updatedGames,
          timestamp: Date.now(),
          ttl
        },
        individualGames: newIndividualGames
      }
    })
  }, [ttl])

  const invalidateGame = useCallback((gameId: string) => {
    setCache(prev => {
      const newIndividualGames = new Map(prev.individualGames)
      newIndividualGames.delete(gameId)
      return {
        ...prev,
        individualGames: newIndividualGames
      }
    })
  }, [])

  const invalidateAll = useCallback(() => {
    setCache({
      games: { data: [], timestamp: 0, ttl },
      individualGames: new Map()
    })
  }, [ttl])

  const clearExpired = useCallback(() => {
    setCache(prev => {
      const newIndividualGames = new Map()
      
      for (const [gameId, entry] of prev.individualGames) {
        if (!isExpired(entry)) {
          newIndividualGames.set(gameId, entry)
        }
      }

      return {
        games: isExpired(prev.games) 
          ? { data: [], timestamp: 0, ttl }
          : prev.games,
        individualGames: newIndividualGames
      }
    })
  }, [isExpired, ttl])

  return {
    getGames,
    setGames,
    getGame,
    setGame,
    updateGame,
    invalidateGame,
    invalidateAll,
    clearExpired,
    isExpired
  }
}