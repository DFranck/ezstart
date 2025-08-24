'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import { useGameSync } from '@/hooks/useGameSync'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { logger } from '@ezstart/ui/lib'
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
    const onGameState = (state: Game & { _reason?: string }) => {
      // Ignorer les états invalides (probablement dus au Hot Refresh)
      if (!state || !state._id || !state.players || state.players.length === 0) {
        console.warn('[GameProvider] Invalid gameState received, ignoring', {
          hasState: !!state,
          hasId: !!state?._id,
          hasPlayers: !!state?.players,
          playersLength: state?.players?.length,
          activeMobsLength: state?.activeMobs?.length,
        })
        return
      }

      // Log complet du gameState pour debug
      logger.debug(`[GameProvider] 🎮 GameState received ${state._reason ? `(${state._reason})` : ''}:`, {
        gameId: state._id,
        tick: state.tick,
        phase: state.phase,
        playersCount: state.players?.length,
        players: state.players?.map(p => ({
          playerId: p.player?._id,
          name: p.player?.name,
          status: p.status,
          hp: p.hp,
          gold: p.gold,
          towersCount: p.placedTowers?.length || 0,
        })),
        activeMobsCount: state.activeMobs?.length,
        activeMobs:
          state.activeMobs?.map(m => ({
            id: m.id,
            name: m.mob.name,
            targetPlayer: m.targetPlayerId,
            position: m.position,
            hp: `${m.currentHp}/${m.mob.hp}`,
          })) || [],
        updatedAt: state.updatedAt,
      })

      // Mettre à jour l'état
      setGame(prevGame => {
        if (prevGame?.updatedAt === state.updatedAt) {
          return prevGame
        }
        return { ...state }
      })
    }

    const onActionRejected = ({ reason }: { reason: string }) => {
      console.warn('[GameProvider] actionRejected:', reason)
      toast.error(`Action rejected: ${reason}`)
    }

    // ---- LOBBY events (utiles même quand on est dans GameProvider) ----
    const onLobbySnapshot = ({ players }: SnapshotPayload) => {
      // Silent handler
    }
    const onLobbyPlayersUpdated = (players: InGamePlayer[]) => {
      // Silent handler
    }
    const onLobbyPlayerJoined = (p: PlayerJoinedPayload) => {
      // Silent handler
    }
    const onLobbyPlayerLeft = (playerId: PlayerLeftPayload) => {
      // Silent handler
    }
    const onLobbyPlayerStatusChanged = (payload: PlayerStatusChangedPayload) => {
      // Silent handler
    }

    // ---- GAME-scoped presence (si tu les émets côté serveur) ----
    const onPlayerJoined = (p: PlayerJoinedPayload) => {
      // Silent handler
    }
    const onPlayerLeft = (playerId: PlayerLeftPayload) => {
      // Silent handler
    }
    const onPlayerStatusChanged = (payload: PlayerStatusChangedPayload) => {
      // Silent handler
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
      // Joining game silently
      socket.emit('game:join', { gameId })
      // Reconnexion au lobby (pour les jeux en cours)
      socket.emit('lobby:reconnect', { gameId, playerId: currentPlayer?._id })
    }

    // Join immédiatement si connecté, sinon attendre la connexion
    socket.connected ? doJoin() : socket.once('connect', doJoin)

    // Hot Refresh : forcer une reconnexion si le state devient invalide
    const checkStateTimeout = setTimeout(() => {
      if (!game || !game._id || !game.players || game.players.length === 0) {
        joinedOnce.current = false // Reset pour permettre une nouvelle connexion
        doJoin()
      }
    }, 2000) // Attendre 2 secondes après l'initialisation

    // ---- Cleanup propre ----
    return () => {
      clearTimeout(checkStateTimeout)

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
