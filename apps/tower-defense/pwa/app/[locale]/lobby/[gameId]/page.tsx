import { logger } from '@ezstart/ui/lib'
import { callApi } from '@ezstart/ui/utils'
import { notFound } from 'next/navigation'
import { LeaveGameButton } from '../../../../components/LeaveGameButton'
import { LobbyPlayersList } from '../components/LobbyPlayersList'
import { StartGameButton } from '../components/StartGameButton'

export default async function LobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const res = await callApi(`/api/games/${gameId}`)
  if (!res.ok) return notFound()

  const game = res.data
  logger.debug('game', game)
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Lobby: {gameId}</h1>
      <LobbyPlayersList players={game.players} />
      <StartGameButton gameId={gameId} />
      <LeaveGameButton gameId={gameId} />
    </div>
  )
}
