'use client'

import { callApi, parseApiError } from '@/utils/api'
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

      if (!res.ok) throw new Error(parseApiError(res.data))
      router.push('/')
    } catch (err) {
      console.error('[games:leave]', err)
    } finally {
      setLoading(false)
    }
  }

  return { leaveGame, loading }
}
