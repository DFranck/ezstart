// app/[locale]/lobby/components/LobbyPlayersList.tsx
'use client'

import { GamePlayer } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { useGamesSocket } from '../../../../contexts/GamesSocketContext'
import { WaitingPlayerCard } from './WaitingPlayerCard'

type Props = {
  players: GamePlayer[]
  gameId: string
  currentUserId?: string
  hostId?: string
}

export function LobbyPlayersList({ players: initialPlayers, gameId, currentUserId, hostId }: Props) {
  const [players, setPlayers] = useState(initialPlayers)
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({})
  const socket = useGamesSocket()

  useEffect(() => {
    // Écouter les mises à jour de la liste des joueurs
    socket.on('lobby:playersUpdated', (updatedPlayers: GamePlayer[]) => {
      setPlayers(updatedPlayers)
    })

    // Écouter les joueurs qui rejoignent
    socket.on('lobby:playerJoined', (newPlayer: GamePlayer) => {
      setPlayers(prev => [...prev, newPlayer])
    })

    // Écouter les joueurs qui partent
    socket.on('lobby:playerLeft', (playerId: string) => {
      setPlayers(prev => prev.filter(p => p.playerId !== playerId))
    })

    // Écouter les changements de statut
    socket.on('lobby:playerStatusChanged', ({ playerId, status, message }: { playerId: string; status: 'active' | 'eliminated' | 'disconnected' | 'left'; message?: string }) => {
      setPlayers(prev => prev.map(p => 
        p.playerId === playerId ? { ...p, status } : p
      ))
      
      if (message) {
        setStatusMessages(prev => ({ ...prev, [playerId]: message }))
        // Effacer le message après 5 secondes
        setTimeout(() => {
          setStatusMessages(prev => {
            const newMessages = { ...prev }
            delete newMessages[playerId]
            return newMessages
          })
        }, 5000)
      }
    })

    // Écouter la suppression du jeu
    socket.on('lobby:gameDeleted', ({ gameId: deletedGameId }: { gameId: string }) => {
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
      socket.off('lobby:playerStatusChanged')
      socket.off('lobby:gameDeleted')
      
      if (currentUserId) {
        socket.emit('lobby:leave', { gameId, playerId: currentUserId })
      }
    }
  }, [socket, gameId, currentUserId])

  // Fonction pour tenter une reconnexion
  const handleReconnect = () => {
    if (currentUserId) {
      socket.emit('lobby:reconnect', { gameId, playerId: currentUserId })
    }
  }

  const activePlayers = players.filter(p => p.status === 'active')
  const disconnectedPlayers = players.filter(p => p.status === 'disconnected')
  const otherPlayers = players.filter(p => p.status !== 'active' && p.status !== 'disconnected')

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold mb-3">
        Players ({activePlayers.length} online, {players.length} total)
      </h3>
      
      {/* Messages de statut */}
      {Object.entries(statusMessages).map(([playerId, message]) => (
        <div key={playerId} className="p-2 bg-blue-100 border border-blue-400 text-blue-700 rounded text-sm">
          {message}
        </div>
      ))}
      
      {/* Joueurs actifs */}
      {activePlayers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400">🟢 Online</h4>
          {activePlayers.map(player => (
            <WaitingPlayerCard
              key={player.playerId}
              player={player}
              isHost={player.playerId === hostId}
              isCurrentUser={player.playerId === currentUserId}
            />
          ))}
        </div>
      )}
      
      {/* Joueurs déconnectés */}
      {disconnectedPlayers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">🟡 Disconnected</h4>
          {disconnectedPlayers.map(player => (
            <WaitingPlayerCard
              key={player.playerId}
              player={player}
              isHost={player.playerId === hostId}
              isCurrentUser={player.playerId === currentUserId}
            />
          ))}
        </div>
      )}
      
      {/* Autres statuts */}
      {otherPlayers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">⚫ Others</h4>
          {otherPlayers.map(player => (
            <WaitingPlayerCard
              key={player.playerId}
              player={player}
              isHost={player.playerId === hostId}
              isCurrentUser={player.playerId === currentUserId}
            />
          ))}
        </div>
      )}
      
      {players.length === 0 && (
        <p className="text-gray-400 italic">No players yet...</p>
      )}
      
      {/* Bouton de reconnexion si le joueur actuel est déconnecté */}
      {currentUserId && disconnectedPlayers.some(p => p.playerId === currentUserId) && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-sm text-yellow-700 mb-2">
            You appear to be disconnected. Click below to reconnect:
          </p>
          <button
            onClick={handleReconnect}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}
    </div>
  )
}
