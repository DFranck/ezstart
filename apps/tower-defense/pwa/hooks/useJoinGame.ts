// hooks/useCreateGame.ts
'use client'

import { callApi } from '@ezstart/ui/utils'

export function useJoinGame() {
  const joinGame = async (gameId: string, playerName: string) => {
    try {
      const res = await callApi(`/api/games/${gameId}/join`, {
        method: 'POST',
        body: { playerName },
      })

      if (!res.ok) throw new Error('Failed to join game')
    } catch (err) {
      console.error('[games:join]', err)
    }
  }

  return { joinGame }
}
