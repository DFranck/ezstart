'use client'

import { useJoinGame } from '@/hooks/useJoinGame'
import { LoadingButton } from './LoadingButton'

type Props = {
  gameId: string
  playerId: string
}

export function JoinGameButton({ gameId, playerId }: Props) {
  const { joinGame, loading } = useJoinGame()
  const isDisabled = !playerId

  return (
    <LoadingButton
      loading={loading}
      disabled={isDisabled}
      onClick={() => joinGame(gameId, playerId)}
      loadingText="Joining game..."
      icon="fa:FaSignInAlt"
    >
      Join the Game
    </LoadingButton>
  )
}
