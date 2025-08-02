'use client'

import { useJoinGame } from '@/hooks/useJoinGame'
import { Button } from '@ezstart/ui/components'

type Props = {
  gameId: string
  playerId: string
}

export function JoinGameButton({ gameId, playerId }: Props) {
  const { joinGame, loading } = useJoinGame()
  const isDisabled = !playerId

  return (
    <Button onClick={() => joinGame(gameId, playerId)} disabled={isDisabled || loading}>
      Join the Game
    </Button>
  )
}
