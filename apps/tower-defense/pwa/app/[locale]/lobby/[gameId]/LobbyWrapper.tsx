'use client'

import { Game } from '@tower-defense/types'
import { useCurrentUser } from '../../../../../hooks/useCurrentUser'
import { LobbyPlayersList } from '../components/LobbyPlayersList'
import { StartGameButton } from '../components/StartGameButton'

type Props = {
  game: Game
  gameId: string
}

export function LobbyWrapper({ game, gameId }: Props) {
  const { user, loading } = useCurrentUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">You must be logged in to join this lobby</p>
      </div>
    )
  }

  const isHost = game.host === user._id
  const currentPlayer = game.players.find(p => p._id === user._id)

  // Si le joueur n'est pas dans la partie, l'ajouter
  if (!currentPlayer) {
    // TODO: Auto-join logic or redirect
    return (
      <div className="text-center p-8">
        <p className="text-orange-500">You are not part of this game</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Game Lobby</h1>
      <div className="text-center mb-4">
        <span className="text-sm text-gray-500">Game ID: {gameId}</span>
      </div>
      
      <LobbyPlayersList 
        players={game.players} 
        gameId={gameId}
        currentUserId={user._id}
        hostId={game.host}
      />
      
      <StartGameButton 
        gameId={gameId} 
        isHost={isHost}
        playerCount={game.players.length}
        currentUserId={user._id}
      />
    </div>
  )
}