'use client'

import { useGameState } from '@/stores/useGameState'
import { callApi } from '@ezstart/ui/utils'
import { notFound, useParams } from 'next/navigation'

import { Game } from '@tower-defense/types'
import { useEffect, useState } from 'react'
import { GameCanvasCanvas } from '../components/GameCanvasCanvas'
import { GameInitializer } from '../components/GameInitializer'
import { Hud } from '../components/Hud'
import { MobShop } from '../components/MobShop'
import { PlayerStatsPanel } from '../components/PlayerStatsPanel'
import { TowerShop } from '../components/TowerShop'

export default function GamePage() {
  const params = useParams<{ gameId: string }>()
  const gameId = params.gameId
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeShop, setActiveShop] = useState<'tower' | 'mob' | 'stats' | null>(null)
  const draggedTower = useGameState(s => s.draggedTower)

  useEffect(() => {
    callApi(`/games/${gameId}`)
      .then(res => {
        if (res.ok) {
          const gameData = res.data as Game
          // Rediriger vers 404 si la game est finie
          if (gameData.phase === 'finished') {
            setError(true)
          } else {
            setGame(gameData)
          }
        } else {
          console.log('Game API error:', res.status)
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [gameId])

  // Auto-close drawer when dragging a tower (mobile) - ONLY for mob/stats shops
  useEffect(() => {
    if (draggedTower && activeShop && activeShop !== 'tower') {
      // Don't close, just let user place tower
    }
  }, [draggedTower, activeShop])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return notFound()
  }

  return (
    <>
      <GameInitializer />
      <div className="flex flex-col h-screen w-full overflow-hidden">
        {/* HUD - Compact on mobile */}
        <Hud game={game} />

        {/* Main Game Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas - Full width on mobile, flexible on desktop */}
          <div className="flex-1 relative overflow-auto">
            <GameCanvasCanvas />
          </div>

          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden md:flex md:w-[320px] flex-col gap-4 p-4 bg-background/95 backdrop-blur border-l overflow-y-auto">
            <TowerShop game={game} />
            <MobShop game={game} />
            <PlayerStatsPanel game={game} />
          </div>
        </div>

        {/* Mobile Tower Bar - Always visible at bottom */}
        <div
          className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t shadow-lg transition-opacity ${
            draggedTower ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <div className="p-2">
            <TowerShop game={game} />
          </div>

          {/* Secondary Actions */}
          <div className="flex justify-center items-center gap-2 px-4 pb-2">
            <button
              onClick={() => setActiveShop(activeShop === 'mob' ? null : 'mob')}
              className={`flex-1 max-w-[140px] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeShop === 'mob'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              👾 Buy Mobs
            </button>
            <button
              onClick={() => setActiveShop(activeShop === 'stats' ? null : 'stats')}
              className={`flex-1 max-w-[140px] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeShop === 'stats'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              📊 Stats
            </button>
          </div>
        </div>

        {/* Mobile Drawer - Slide up from bottom (Mobs/Stats only) */}
        {activeShop && activeShop !== 'tower' && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-50 animate-in fade-in"
              onClick={() => setActiveShop(null)}
            />

            {/* Drawer */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              {/* Handle */}
              <div className="sticky top-0 bg-background pt-3 pb-2 px-4 border-b z-10">
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {activeShop === 'mob' && '👾 Mob Shop'}
                    {activeShop === 'stats' && '📊 Player Stats'}
                  </h3>
                  <button
                    onClick={() => setActiveShop(null)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {activeShop === 'mob' && <MobShop game={game} />}
                {activeShop === 'stats' && <PlayerStatsPanel game={game} />}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
