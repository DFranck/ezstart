// app/[locale]/lobby/components/LobbyPlayersList.tsx
'use client'

/* path: app/[locale]/lobby/components/LobbyPlayersList.tsx */
import { useGamesSocketInstance } from '@/contexts/GamesSocketContext'
import { InGamePlayer } from '@tower-defense/types'
import { useEffect, useMemo, useState } from 'react'
import { WaitingPlayerCard } from './WaitingPlayerCard'

type Props = {
  players: InGamePlayer[]
  gameId: string
  currentUserId?: string
  hostId?: string
}

const getPlayerId = (p: InGamePlayer) => (typeof p.player === 'string' ? p.player : p.player?._id)

export function LobbyPlayersList({
  players: initialPlayers,
  gameId,
  currentUserId,
  hostId,
}: Props) {
  const socket = useGamesSocketInstance()

  const [players, setPlayers] = useState<InGamePlayer[]>(initialPlayers)
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({})
  const [connected, setConnected] = useState<boolean>(socket.connected)

  // keep local list in sync if server pushes a fresh game state via SSR/refresh
  useEffect(() => {
    setPlayers(initialPlayers)
  }, [initialPlayers])

  // Join room only after socket is connected (prevents “join too early”)
  useEffect(() => {
    const onConnect = () => {
      setConnected(true)
      if (currentUserId) {
        socket.emit('lobby:join', { gameId, playerId: currentUserId })
      }
    }
    const onDisconnect = () => setConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Live updates
    socket.on('lobby:playersUpdated', (updated: InGamePlayer[]) => setPlayers(updated))
    socket.on('lobby:playerJoined', (p: InGamePlayer) =>
      setPlayers(prev => {
        const id = getPlayerId(p)
        if (!id) return prev
        // avoid duplicates
        const exists = prev.some(x => getPlayerId(x) === id)
        return exists ? prev : [...prev, p]
      })
    )
    socket.on('lobby:playerLeft', (playerId: string) =>
      setPlayers(prev => prev.filter(x => getPlayerId(x) !== playerId))
    )
    socket.on(
      'lobby:playerStatusChanged',
      ({
        playerId,
        status,
        message,
      }: {
        playerId: string
        status: 'active' | 'eliminated' | 'disconnected' | 'left'
        message?: string
      }) => {
        setPlayers(prev => prev.map(p => (getPlayerId(p) === playerId ? { ...p, status } : p)))
        if (message) {
          setStatusMessages(prev => ({ ...prev, [playerId]: message }))
          setTimeout(() => {
            setStatusMessages(prev => {
              const next = { ...prev }
              delete next[playerId]
              return next
            })
          }, 5000)
        }
      }
    )

    // If already connected when mounting (fast refresh), ensure join
    if (socket.connected && currentUserId) {
      socket.emit('lobby:join', { gameId, playerId: currentUserId })
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('lobby:playersUpdated')
      socket.off('lobby:playerJoined')
      socket.off('lobby:playerLeft')
      socket.off('lobby:playerStatusChanged')
      if (currentUserId) {
        socket.emit('lobby:leave', { gameId, playerId: currentUserId })
      }
    }
  }, [socket, gameId, currentUserId])

  const handleReconnect = () => {
    if (currentUserId) socket.emit('lobby:reconnect', { gameId, playerId: currentUserId })
  }

  const groups = useMemo(() => {
    const withId = players.filter(p => !!getPlayerId(p))
    return {
      active: withId.filter(p => p.status === 'active'),
      disconnected: withId.filter(p => p.status === 'disconnected'),
      others: withId.filter(p => !['active', 'disconnected'].includes(p.status as string)),
    }
  }, [players])

  const onlineCount = groups.active.length

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Players ({onlineCount} online, {players.length} total)
        </h3>
        <span
          className={`px-2 py-1 text-xs rounded ${
            connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
          title={connected ? 'Socket connected' : 'Socket disconnected'}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {Object.entries(statusMessages).map(([pid, msg]) => (
        <div
          key={pid}
          className="p-2 bg-blue-100 border border-blue-400 text-blue-700 rounded text-sm"
        >
          {msg}
        </div>
      ))}

      {groups.active.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400">🟢 Online</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.active.map(p => {
              const pid = getPlayerId(p)!
              return (
                <WaitingPlayerCard
                  key={pid}
                  player={p}
                  isHost={pid === hostId}
                  isCurrentUser={pid === currentUserId}
                />
              )
            })}
          </ul>
        </section>
      )}

      {groups.disconnected.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            🟡 Disconnected
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.disconnected.map(p => {
              const pid = getPlayerId(p)!
              return (
                <WaitingPlayerCard
                  key={pid}
                  player={p}
                  isHost={pid === hostId}
                  isCurrentUser={pid === currentUserId}
                />
              )
            })}
          </ul>
        </section>
      )}

      {groups.others.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">⚫ Others</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groups.others.map(p => {
              const pid = getPlayerId(p)!
              return (
                <WaitingPlayerCard
                  key={pid}
                  player={p}
                  isHost={pid === hostId}
                  isCurrentUser={pid === currentUserId}
                />
              )
            })}
          </ul>
        </section>
      )}

      {players.length === 0 && <p className="text-gray-400 italic">No players yet...</p>}

      {currentUserId && groups.disconnected.some(p => getPlayerId(p) === currentUserId) && (
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
