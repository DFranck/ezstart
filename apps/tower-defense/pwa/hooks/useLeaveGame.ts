'use client'

import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function useLeaveGame() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const leaveGame = async (gameId: string, playerId: string) => {
    try {
      setLoading(true)
      const res = await callApi(`/api/games/${gameId}/leave`, {
        method: 'POST',
        body: { playerId },
      })

      if (!res.ok) throw new Error('Failed to leave game')
      router.push('/')
    } catch (err) {
      console.error('[games:leave]', err)
    } finally {
      setLoading(false)
    }
  }

  return { leaveGame, loading }
}
