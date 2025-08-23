// app/[locale]/lobby/components/WaitingPlayerCard.tsx
'use client'

/* path: app/[locale]/lobby/components/WaitingPlayerCard.tsx */
import { InGamePlayer } from '@tower-defense/types'
import { useMemo } from 'react'

type Props = {
  player: InGamePlayer
  isHost?: boolean
  isCurrentUser?: boolean
}

const statusChip = (status: InGamePlayer['status']) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700'
    case 'disconnected':
      return 'bg-yellow-100 text-yellow-700'
    case 'eliminated':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function WaitingPlayerCard({ player, isHost, isCurrentUser }: Props) {
  const name = useMemo(() => {
    if (typeof player.player === 'string') return player.player
    return player.player?.name ?? 'Unknown'
  }, [player])

  return (
    <li className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{name}</span>
            {isHost && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                HOST
              </span>
            )}
            {isCurrentUser && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">YOU</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Gold: {player.gold} • Income: {player.income} • HP: {player.hp}
          </div>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${statusChip(player.status)}`}>
        {player.status}
      </span>
    </li>
  )
}
