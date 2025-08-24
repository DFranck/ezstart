'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import { useGameSync } from '@/hooks/useGameSync'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { PlayerStatus } from '@tower-defense/config'
import type { Game, GameAction, InGamePlayer, JoinGameResponse } from '@tower-defense/types'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { GameContext } from '../contexts/GameContext'

type PlayerJoinedPayload = JoinGameResponse | { _id: string; name: string }
type PlayerLeftPayload = string
type PlayerStatusChangedPayload = { playerId: string; status: PlayerStatus; message?: string }
type SnapshotPayload = { players: InGamePlayer[] }

export function GameProvider({ gameId, children }: { gameId: string; children: React.ReactNode }) {
  const { socket } = useGamesSocket()
  const currentPlayer = usePlayerStore(s => s.player)
  const [game, setGame] = useState<Game | null>(null)
  const joinedOnce = useRef(false)


  useEffect(() => {
    if (!socket) return

    // ---- Handlers (stables) ----
    const onGameState = (state: Game) => {
      // State complet côté jeu
      console.debug('[GameProvider] Received gameState update', {
        playersCount: state.players?.length || 0,
        phase: state.phase,
        gameId: state._id,
        players: state.players?.map(p => ({
          id: p.player?._id || 'unknown',
          towers: p.placedTowers?.length || 0
        })) || []
      })
      setGame(state)
    }

    const onActionRejected = ({ reason }: { reason: string }) => {
      console.warn('[GameProvider] actionRejected:', reason)
      toast.error(`Action rejected: ${reason}`)
    }

    // ---- LOBBY events (utiles même quand on est dans GameProvider) ----
    const onLobbySnapshot = ({ players }: SnapshotPayload) => {
      console.debug('[GameProvider] lobby:snapshot', { playersCount: players.length, players })
    }
    const onLobbyPlayersUpdated = (players: InGamePlayer[]) => {
      console.debug('[GameProvider] lobby:playersUpdated', {
        playersCount: players.length,
        players,
      })
    }
    const onLobbyPlayerJoined = (p: PlayerJoinedPayload) => {
      console.info('[GameProvider] lobby:playerJoined', p)
    }
    const onLobbyPlayerLeft = (playerId: PlayerLeftPayload) => {
      console.info('[GameProvider] lobby:playerLeft', { playerId })
    }
    const onLobbyPlayerStatusChanged = (payload: PlayerStatusChangedPayload) => {
      console.info('[GameProvider] lobby:playerStatusChanged', payload)
    }

    // ---- GAME-scoped presence (si tu les émets côté serveur) ----
    const onPlayerJoined = (p: PlayerJoinedPayload) => {
      console.info('[GameProvider] playerJoined', p)
    }
    const onPlayerLeft = (playerId: PlayerLeftPayload) => {
      console.info('[GameProvider] playerLeft', { playerId })
    }
    const onPlayerStatusChanged = (payload: PlayerStatusChangedPayload) => {
      console.info('[GameProvider] playerStatusChanged', payload)
    }

    const onGameFinished = (payload: any) => {
      console.info('[GameProvider] gameFinished', payload)
      // Le GameMenu s'occupe déjà de la redirection, on log juste ici
    }

    // ---- Brancher tous les listeners AVANT de join ----
    socket.on('gameState', onGameState)
    socket.on('actionRejected', onActionRejected)

    // Lobby namespace
    socket.on('lobby:snapshot', onLobbySnapshot)
    socket.on('lobby:playersUpdated', onLobbyPlayersUpdated)
    socket.on('lobby:playerJoined', onLobbyPlayerJoined)
    socket.on('lobby:playerLeft', onLobbyPlayerLeft)
    socket.on('lobby:playerStatusChanged', onLobbyPlayerStatusChanged)

    // Game namespace
    socket.on('playerJoined', onPlayerJoined)
    socket.on('playerLeft', onPlayerLeft)
    socket.on('playerStatusChanged', onPlayerStatusChanged)
    socket.on('gameFinished', onGameFinished)

    // ---- Join après connexion (sinon event perdu) ----
    const doJoin = () => {
      if (joinedOnce.current || !currentPlayer) return
      joinedOnce.current = true
      console.log('[GameProvider] Joining game as player:', currentPlayer?._id)
      socket.emit('game:join', { gameId })
      // Reconnexion au lobby (pour les jeux en cours)
      socket.emit('lobby:reconnect', { gameId, playerId: currentPlayer?._id })
    }

    socket.connected ? doJoin() : socket.once('connect', doJoin)

    // ---- Cleanup propre ----
    return () => {
      if (joinedOnce.current && currentPlayer) {
        socket.emit('game:leave', { gameId })
        // Pas besoin de lobby:leave pour une reconnexion
        joinedOnce.current = false
      }

      socket.off('gameState', onGameState)
      socket.off('actionRejected', onActionRejected)

      socket.off('lobby:snapshot', onLobbySnapshot)
      socket.off('lobby:playersUpdated', onLobbyPlayersUpdated)
      socket.off('lobby:playerJoined', onLobbyPlayerJoined)
      socket.off('lobby:playerLeft', onLobbyPlayerLeft)
      socket.off('lobby:playerStatusChanged', onLobbyPlayerStatusChanged)

      socket.off('playerJoined', onPlayerJoined)
      socket.off('playerLeft', onPlayerLeft)
      socket.off('playerStatusChanged', onPlayerStatusChanged)
      socket.off('gameFinished', onGameFinished)
    }
  }, [socket, gameId, currentPlayer])

  return (
    <GameContext.Provider
      value={{
        game,
        sendAction: (action: GameAction) => {
          if (socket) {
            socket.emit('gameAction', { gameId, action })
          }
        },
      }}
    >
      <GameSync />
      {children}
    </GameContext.Provider>
  )
}

// Composant interne pour la synchronisation
function GameSync() {
  useGameSync()
  return null
}
