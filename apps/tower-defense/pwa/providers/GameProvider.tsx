'use client'

import { useGamesSocketInstance } from '@/contexts/GamesSocketContext'
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
  const socket = useGamesSocketInstance()
  const [game, setGame] = useState<Game | null>(null)
  const joinedOnce = useRef(false)

  useEffect(() => {
    // ---- Handlers (stables) ----
    const onGameState = (state: Game) => {
      // State complet côté jeu
      // console.debug('[GameProvider] gameState', state)
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

    // ---- Join après connexion (sinon event perdu) ----
    const doJoin = () => {
      if (joinedOnce.current) return
      joinedOnce.current = true
      socket.emit('game:join', { gameId })
      // si ton serveur émet un snapshot immédiatement:
      // socket.emit('lobby:join', { gameId, playerId: currentUserId }) // si tu veux aussi suivre le lobby ici
    }

    socket.connected ? doJoin() : socket.once('connect', doJoin)

    // ---- Cleanup propre ----
    return () => {
      if (joinedOnce.current) {
        socket.emit('game:leave', { gameId })
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
    }
  }, [socket, gameId])

  return (
    <GameContext.Provider
      value={{
        game,
        sendAction: (action: GameAction) => socket.emit('gameAction', { gameId, action }),
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
