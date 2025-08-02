'use client'

import { Button } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  gameId: string
  playerName: string
}

export function JoinGameButton({ gameId, playerName }: Props) {
  const [loading, setLoading] = useState(false)
  const isDisabled = !playerName
  const router = useRouter()

  const joinGame = async () => {
    setLoading(true)
    try {
      const response = await callApi(`/api/games/${gameId}/join`, {
        method: 'POST',
        body: { playerName },
      })

      if (!response.ok) throw new Error('Failed to join game')
      router.push(`/lobby/${gameId}`)
    } catch (err) {
      console.error('[games:join]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={joinGame} disabled={isDisabled || loading}>
      Join the Game
    </Button>
  )
}
