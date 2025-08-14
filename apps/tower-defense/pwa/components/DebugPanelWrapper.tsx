'use client'

import { useGames } from '@/hooks/useGames'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { DebugPanel } from '@ezstart/ui/components'
import { Game } from '@tower-defense/types'

export function DebugPanelWrapper() {
  const { player, register, reset } = usePlayerStore()

  const { waitingGames, isLoading, error, fetchGames } = useGames({
    autoRedirect: false, // Pas d'auto-redirect dans le debug panel
    pollingInterval: 10000,
    enablePolling: !!player?._id,
  })

  // Debug sections
  const debugSections = [
    {
      id: 'player-state',
      title: 'Player State',
      icon: '👤',
      defaultExpanded: true,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>Logged in: {player ? '✅' : '❌'}</div>
          {player && (
            <>
              <div>Name: {player.name}</div>
              <div>ID: {player._id}</div>
              <div>Rank: {player.rank}</div>
              <div>Games Played: {player.gamesPlayed}</div>
              <div>Games Won: {player.gamesWon}</div>
            </>
          )}
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            <button
              onClick={() => register('TestPlayer')}
              style={{
                padding: '4px 8px',
                background: '#4CAF50',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Register Test
            </button>
            <button
              onClick={reset}
              style={{
                padding: '4px 8px',
                background: '#f44336',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'games-state',
      title: 'Games State',
      icon: '🎮',
      defaultExpanded: true,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>Loading: {isLoading ? '✅' : '❌'}</div>
          <div>Games count: {waitingGames.length}</div>
          <div>Error: {error ? '❌' : '✅'}</div>
          {error && <div style={{ color: '#ff6b6b' }}>{error}</div>}
          <button
            onClick={() => player?._id && fetchGames(player._id)}
            style={{
              padding: '4px 8px',
              background: '#2196F3',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Refresh Games
          </button>
        </div>
      ),
    },
    {
      id: 'games-list',
      title: 'Games List',
      icon: '📋',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {waitingGames.length === 0 ? (
            <div style={{ color: '#888' }}>No games</div>
          ) : (
            waitingGames.map((game: Game) => (
              <div
                key={game._id}
                style={{
                  fontSize: '10px',
                  padding: '4px',
                  border: '1px solid #333',
                  borderRadius: '4px',
                }}
              >
                <div>ID: {game._id}</div>
                <div>Host: {game.host}</div>
                <div>Players: {game.players?.length || 0}</div>
                <div>Phase: {game.phase}</div>
              </div>
            ))
          )}
        </div>
      ),
    },
  ]

  return <DebugPanel sections={debugSections} />
}
