'use client'

import { GamePlayer } from '@tower-defense/types'

type Props = {
  player: GamePlayer
  isHost: boolean
  isCurrentUser: boolean
}

export function WaitingPlayerCard({ player, isHost, isCurrentUser }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'disconnected':
        return 'bg-yellow-500'
      case 'eliminated':
        return 'bg-red-500'
      case 'left':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Online'
      case 'disconnected':
        return 'Disconnected'
      case 'eliminated':
        return 'Eliminated'
      case 'left':
        return 'Left'
      default:
        return 'Unknown'
    }
  }

  const isDisconnected = player.status === 'disconnected'
  const isEliminated = player.status === 'eliminated'
  const isLeft = player.status === 'left'

  return (
    <div className={`p-3 border rounded transition-colors ${
      isCurrentUser 
        ? 'bg-blue-500/20 border-blue-500/50' 
        : isDisconnected
          ? 'bg-yellow-500/10 border-yellow-500/30 opacity-70'
          : isEliminated
            ? 'bg-red-500/10 border-red-500/30 opacity-60'
            : isLeft
              ? 'bg-gray-500/10 border-gray-500/30 opacity-50'
              : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isDisconnected || isEliminated || isLeft ? 'line-through' : ''}`}>
            {player.name}
          </span>
          {isCurrentUser && (
            <span className="text-xs bg-green-500 px-2 py-1 rounded text-white">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <span className="text-xs bg-yellow-500 px-2 py-1 rounded text-black font-medium">
              Host
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(player.status)} ${
              player.status === 'active' ? 'animate-pulse' : ''
            }`} />
            <span className="text-xs text-gray-500">
              {getStatusText(player.status)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Informations supplémentaires pour les joueurs déconnectés */}
      {isDisconnected && (
        <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
          ⚠️ Can reconnect anytime
        </div>
      )}
      
      {isEliminated && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          💀 Eliminated from the game
        </div>
      )}
      
      {isLeft && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          🚪 Left the game
        </div>
      )}
    </div>
  )
}