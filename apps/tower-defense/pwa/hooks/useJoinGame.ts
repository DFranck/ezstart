// hooks/useJoinGame.ts
'use client'

import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useErrorHandler } from './useErrorHandler'

export function useJoinGame() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { executeWithRetry, addError } = useErrorHandler({
    maxRetries: 3,
    retryDelay: 1000
  })

  const validateInputs = (gameId: string, playerId: string) => {
    if (!gameId) {
      throw new Error('Game ID is required')
    }
    if (!playerId) {
      throw new Error('Player ID is required')
    }
    if (typeof gameId !== 'string' || typeof playerId !== 'string') {
      throw new Error('Game ID and Player ID must be strings')
    }
  }

  const joinGame = async (gameId: string, playerId: string) => {
    try {
      // Validation côté client
      validateInputs(gameId, playerId)
      
      setLoading(true)
      
      const response = await executeWithRetry(
        () => callApi(`/api/games/${gameId}/join`, {
          method: 'POST',
          body: { playerId },
        }),
        (error, attempt) => {
          console.warn(`[joinGame] Attempt ${attempt} failed:`, error)
          addError(`Failed to join game (attempt ${attempt}/3)`, true)
        }
      )

      if (!response.ok) {
        const errorMessage = response.error || 'Failed to join game'
        throw new Error(errorMessage)
      }

      // Redirection vers le lobby
      router.push(`/en/lobby/${gameId}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      addError(errorMessage, false)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { 
    joinGame, 
    loading,
    error: null // Les erreurs sont gérées par useErrorHandler
  }
}
