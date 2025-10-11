'use client'

import { PerformanceMonitor } from '@/components/PerformanceMonitor'
import { useGame } from '@/contexts/GameContext'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useState } from 'react'
import { MultiPlayerCanvas } from './MultiPlayerCanvas'
import { PlayersViewMenu } from './PlayersViewMenu'

export function GameCanvasCanvas() {
  const currentPlayer = usePlayerStore(s => s.player)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const { game } = useGame()

  // Toujours afficher le canvas du joueur actuel par défaut
  const displayedPlayerId = selectedPlayerId || currentPlayer?._id || null

  // Calculate entity counts for performance monitor
  const totalMobs = game?.activeMobs?.length || 0
  const totalTowers = game?.players?.reduce((sum, p) => sum + (p.placedTowers?.length || 0), 0) || 0

  // Per-player breakdown
  // Note: activeMobs are global in game, not per-player. We show incoming units instead.
  const players =
    game?.players?.map(p => ({
      name: p.player?.name || 'Unknown',
      mobs: p.incomingUnits?.length || 0, // Units sent to this player
      towers: p.placedTowers?.length || 0,
      hp: p.hp || 0,
    })) || []

  // Canvas rendering for player display

  return (
    <div className="relative max-w-[600px] z-10">
      <PlayersViewMenu
        selectedPlayerId={selectedPlayerId}
        onPlayerSelect={setSelectedPlayerId}
        currentPlayerId={currentPlayer?._id || null}
      />

      <MultiPlayerCanvas selectedPlayerId={displayedPlayerId} />

      {/* Performance Monitor Overlay */}
      <PerformanceMonitor
        totalMobs={totalMobs}
        totalTowers={totalTowers}
        totalProjectiles={0} // TODO: Track projectiles if needed
        players={players}
        tickRate={4} // 4 Hz (250ms tick interval)
      />
    </div>
  )
}
