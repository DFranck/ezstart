// hooks/useCreateGame.ts
'use client'

import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { CreateGamePayload, CreateGameResponse } from '@tower-defense/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function useCreateGame() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const validatePayload = (payload: CreateGamePayload) => {
    if (!payload.playerId) {
      throw new Error('Player ID is required')
    }
    if (typeof payload.playerId !== 'string') {
      throw new Error('Player ID must be a string')
    }
  }

  const createGame = async (payload: CreateGamePayload) => {
    validatePayload(payload)

    return runWithFeedback({
      action: async () => {
        const response = await callApi<CreateGameResponse>('/api/games', {
          method: 'POST',
          body: payload,
        })

        if (!response.ok) {
          throw new Error('Failed to create game')
        }

        if (!response.data?.gameId) {
          throw new Error('Invalid response: missing game ID')
        }

        // Redirection vers le lobby
        router.push(`/en/lobby/${response.data.gameId}`)

        return response.data
      },
      toastLoading: { message: 'Creating game...' },
      toastSuccess: { message: 'Game created successfully!' },
      toastError: { message: 'Failed to create game' },
      onLoadingChange: setLoading,
      throwOnError: true,
    })
  }

  return {
    createGame,
    loading,
  }
}
