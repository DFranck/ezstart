'use client'

import { useGame } from '@/contexts/GameContext'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, Icon } from '@ezstart/ui/components'

interface PlayersViewMenuProps {
  selectedPlayerId: string | null
  onPlayerSelect: (playerId: string | null) => void
  currentPlayerId: string | null
}

export function PlayersViewMenu({
  selectedPlayerId,
  onPlayerSelect,
  currentPlayerId,
}: PlayersViewMenuProps) {
  const { game } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)

  if (!game || !currentPlayer || !currentPlayerId) return null

  const players = game.players || []
  const otherPlayers = players.filter(p => p.player?._id !== currentPlayerId)
  const currentPlayerData = players.find(p => p.player?._id === currentPlayerId)

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex flex-col gap-2">
        {/* Bouton pour revenir à son canvas */}
        <Button
          variant={selectedPlayerId === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPlayerSelect(null)}
          className={`${
            selectedPlayerId === null
              ? 'bg-blue-500 text-white'
              : 'bg-white/90 backdrop-blur-sm hover:bg-blue-50'
          }`}
        >
          <Icon name="fa:FaUser" size={16} />
          Vous ({currentPlayerData?.placedTowers?.length || 0})
        </Button>

        {/* Boutons pour les autres joueurs */}
        {otherPlayers.map((player, index) => (
          <Button
            key={player.player?._id || `player-${index}`}
            variant={selectedPlayerId === player.player?._id ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              onPlayerSelect(selectedPlayerId === player.player?._id ? null : player.player?._id)
            }
            className={`${
              selectedPlayerId === player.player?._id
                ? 'bg-red-500 text-white'
                : 'bg-white/90 backdrop-blur-sm hover:bg-red-50'
            }`}
            title={`Joueur ${index + 1}: ${player.placedTowers?.length || 0} tours`}
          >
            <Icon name="fa:FaUser" size={16} />J{index + 1} ({player.placedTowers?.length || 0})
          </Button>
        ))}
      </div>
    </div>
  )
}
