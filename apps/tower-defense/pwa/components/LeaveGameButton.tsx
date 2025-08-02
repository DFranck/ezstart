'use client'

import { useLeaveGame } from '@/hooks/useLeaveGame'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button } from '@ezstart/ui/components'

export function LeaveGameButton({ gameId }: { gameId: string }) {
  const { player } = usePlayerStore()
  const { leaveGame, loading } = useLeaveGame()

  return (
    <Button
      onClick={() => leaveGame(gameId, player?._id || '')}
      variant="destructive"
      disabled={loading}
    >
      {loading ? 'Leaving...' : 'Leave Game'}
    </Button>
  )
}
