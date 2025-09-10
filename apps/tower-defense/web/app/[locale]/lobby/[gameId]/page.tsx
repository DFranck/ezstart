import { logger } from '@ezstart/ui/lib'
import { callApi } from '@ezstart/ui/utils'
import { notFound } from 'next/navigation'
import { LeaveGameButton } from '../../../../components/LeaveGameButton'
import { LobbyWrapper } from './LobbyWrapper'

export default async function LobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const res = await callApi(`/api/games/${gameId}`)
  if (!res.ok) return notFound()

  const game = res.data
  logger.debug('game', game)
  
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <LobbyWrapper game={game} gameId={gameId} />
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <LeaveGameButton gameId={gameId} />
      </div>
    </div>
  )
}
