// hooks/useCreateGame.ts
'use client'

import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function useJoinGame() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const joinGame = async (gameId: string, playerId: string) => {
    setLoading(true)
    try {
      const res = await callApi(`/api/games/${gameId}/join`, {
        method: 'POST',
        body: { playerId },
      })

      if (!res.ok) throw new Error('Failed to join game')
      router.push(`/en/lobby/${gameId}`)
    } catch (err) {
      console.error('[games:join]', err)
    } finally {
      setLoading(false)
    }
  }

  return { joinGame, loading }
}
