// hooks/useCreateGame.ts
'use client'

import { callApi } from '@ezstart/ui/utils'
import { CreateGamePayload, CreateGameResponse } from '@tower-defense/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useErrorHandler } from './useErrorHandler'

export function useCreateGame() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { executeWithRetry, addError } = useErrorHandler({
    maxRetries: 3,
    retryDelay: 1000
  })

  const validatePayload = (payload: CreateGamePayload) => {
    if (!payload.playerId) {
      throw new Error('Player ID is required')
    }
    if (typeof payload.playerId !== 'string') {
      throw new Error('Player ID must be a string')
    }
  }

  const createGame = async (payload: CreateGamePayload) => {
    try {
      // Validation côté client
      validatePayload(payload)
      
      setLoading(true)
      
      const response = await executeWithRetry(
        () => callApi<CreateGameResponse>('/api/games', {
          method: 'POST',
          body: payload,
        }),
        (error, attempt) => {
          console.warn(`[createGame] Attempt ${attempt} failed:`, error)
          addError(`Failed to create game (attempt ${attempt}/3)`, true)
        }
      )

      if (!response.ok) {
        const errorMessage = response.error || 'Failed to create game'
        throw new Error(errorMessage)
      }

      if (!response.data?.gameId) {
        throw new Error('Invalid response: missing game ID')
      }

      // Redirection vers le lobby
      router.push(`/en/lobby/${response.data.gameId}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      addError(errorMessage, false)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { 
    createGame, 
    loading,
    error: null // Les erreurs sont gérées par useErrorHandler
  }
}
