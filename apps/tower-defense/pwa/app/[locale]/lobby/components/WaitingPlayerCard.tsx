'use client'

import { Player } from '@tower-defense/types'

type Props = {
  player: Player
  isHost: boolean
  isCurrentUser: boolean
}

export function WaitingPlayerCard({ player, isHost, isCurrentUser }: Props) {
  return (
    <div className={`p-3 border rounded transition-colors ${
      isCurrentUser 
        ? 'bg-blue-500/20 border-blue-500/50' 
        : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{player.name}</span>
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
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}