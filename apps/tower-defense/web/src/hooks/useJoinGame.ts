// hooks/useJoinGame.ts
'use client'

import { callApi, runWithFeedback } from '@/utils/api'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function useJoinGame() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
    validateInputs(gameId, playerId)

    return runWithFeedback({
      action: async () => {
        const response = await callApi(`/api/games/${gameId}/join`, {
          method: 'POST',
          body: { playerId },
        })

        if (!response.ok) {
          throw new Error('Failed to join game')
        }

        // Redirection vers le lobby
        router.push(`/en/lobby/${gameId}`)

        return response.data
      },
      toastLoading: { message: 'Joining game...' },
      toastSuccess: { message: 'Successfully joined game!' },
      toastError: { message: 'Failed to join game' },
      onLoadingChange: setLoading,
      throwOnError: true,
    })
  }

  return {
    joinGame,
    loading,
  }
}
