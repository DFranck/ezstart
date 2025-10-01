// app/[locale]/lobby/LobbyWrapper.tsx
'use client'

/* path: app/[locale]/lobby/LobbyWrapper.tsx */
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Game, InGamePlayer, Player } from '@tower-defense/types'
import { LobbyPlayersList } from '../components/LobbyPlayersList'
import { StartGameButton } from '../components/StartGameButton'

type Props = { game: Game; gameId: string }

export function LobbyWrapper({ game, gameId }: Props) {
  const player: Player | null = usePlayerStore(s => s.player)

  if (!player) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">You must be logged in to join this lobby</p>
      </div>
    )
  }

  // Extraire l'ID du host (peut être un objet ou un string)
  const hostId = typeof game.host === 'object' && game.host !== null
    ? (game.host as any)._id
    : game.host

  const getPlayerId = (p: InGamePlayer) => p.player._id

  const currentPlayer = game.players.find(p => getPlayerId(p) === player?._id)
  if (!currentPlayer) {
    return (
      <div className="text-center p-8">
        <p className="text-orange-500">You are not part of this game</p>
      </div>
    )
  }

  const isHost = hostId === player?._id

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Game Lobby</h1>
      <div className="text-center mb-6">
        <span className="text-sm text-gray-500">Game ID: {gameId}</span>
      </div>

      <LobbyPlayersList
        players={game.players}
        gameId={gameId}
        currentUserId={player?._id}
        hostId={hostId}
      />

      <StartGameButton
        gameId={gameId}
        isHost={isHost}
        playerCount={game.players.filter(p => p.status === 'active').length}
        currentUserId={player?._id}
      />
    </div>
  )
}
