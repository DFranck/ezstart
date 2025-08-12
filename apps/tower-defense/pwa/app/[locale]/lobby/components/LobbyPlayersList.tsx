// app/[locale]/lobby/components/LobbyPlayersList.tsx
'use client'

import { Player } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { useGamesSocket } from '../../../../../contexts/GamesSocketContext'
import { WaitingPlayerCard } from './WaitingPlayerCard'

type Props = {
  players: Player[]
  gameId: string
  currentUserId?: string
  hostId?: string
}

export function LobbyPlayersList({ players: initialPlayers, gameId, currentUserId, hostId }: Props) {
  const [players, setPlayers] = useState(initialPlayers)
  const socket = useGamesSocket()

  useEffect(() => {
    // Écouter les mises à jour de la liste des joueurs
    socket.on('lobby:playersUpdated', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers)
    })

    // Écouter les joueurs qui rejoignent
    socket.on('lobby:playerJoined', (newPlayer: Player) => {
      setPlayers(prev => [...prev, newPlayer])
    })

    // Écouter les joueurs qui partent
    socket.on('lobby:playerLeft', (playerId: string) => {
      setPlayers(prev => prev.filter(p => p._id !== playerId))
    })

    // Écouter la suppression du jeu
    socket.on('lobby:gameDeleted', ({ gameId: deletedGameId }) => {
      if (deletedGameId === gameId) {
        // Rediriger vers la page d'accueil si le jeu a été supprimé
        window.location.href = '/'
      }
    })

    // Rejoindre la room du lobby avec le playerId
    if (currentUserId) {
      socket.emit('lobby:join', { gameId, playerId: currentUserId })
    }

    return () => {
      socket.off('lobby:playersUpdated')
      socket.off('lobby:playerJoined')
      socket.off('lobby:playerLeft')
      socket.off('lobby:gameDeleted')
      
      if (currentUserId) {
        socket.emit('lobby:leave', { gameId, playerId: currentUserId })
      }
    }
  }, [socket, gameId, currentUserId])

  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-lg font-semibold mb-3">Players ({players.length})</h3>
      {players.length === 0 ? (
        <p className="text-gray-400 italic">No players yet...</p>
      ) : (
        players.map(player => (
          <WaitingPlayerCard
            key={player._id}
            player={player}
            isHost={player._id === hostId}
            isCurrentUser={player._id === currentUserId}
          />
        ))
      )}
    </div>
  )
}
