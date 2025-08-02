'use client'

import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'

export function useLeaveGame() {
  const router = useRouter()
  const leaveGame = async (gameId: string, playerId: string) => {
    try {
      const res = await callApi(`/api/games/${gameId}/leave`, {
        method: 'POST',
        body: { playerId },
      })

      if (!res.ok) throw new Error('Failed to leave game')
      router.push('/')
    } catch (err) {
      console.error('[games:leave]', err)
    }
  }

  return { leaveGame }
}
