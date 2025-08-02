'use client'

import { Button } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LeaveGameButton({ gameId, playerId }: { gameId: string; playerId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const leaveGame = async () => {
    setLoading(true)
    try {
      const response = await callApi(`/api/games/${gameId}/leave`, {
        method: 'POST',
        body: { playerId },
      })

      if (!response.ok) throw new Error('Failed to leave game')
      router.push('/')
    } catch (err) {
      console.error('[games:leave]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={leaveGame} variant="destructive" disabled={loading}>
      {loading ? 'Leaving...' : 'Leave Game'}
    </Button>
  )
}
