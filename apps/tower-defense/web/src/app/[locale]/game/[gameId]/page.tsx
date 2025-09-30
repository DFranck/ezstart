'use client'

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

        {/* Mobile Floating Action Buttons */}
        <div className="md:hidden fixed bottom-4 left-0 right-0 flex justify-center items-center gap-3 px-4 z-40">
          <button
            onClick={() => setActiveShop(activeShop === 'tower' ? null : 'tower')}
            className={`flex-1 max-w-[120px] px-4 py-3 rounded-xl font-semibold shadow-lg transition-all ${
              activeShop === 'tower'
                ? 'bg-primary text-primary-foreground scale-105'
                : 'bg-background/95 backdrop-blur border-2 hover:scale-105'
            }`}
          >
            🏰 Towers
          </button>
          <button
            onClick={() => setActiveShop(activeShop === 'mob' ? null : 'mob')}
            className={`flex-1 max-w-[120px] px-4 py-3 rounded-xl font-semibold shadow-lg transition-all ${
              activeShop === 'mob'
                ? 'bg-primary text-primary-foreground scale-105'
                : 'bg-background/95 backdrop-blur border-2 hover:scale-105'
            }`}
          >
            👾 Mobs
          </button>
          <button
            onClick={() => setActiveShop(activeShop === 'stats' ? null : 'stats')}
            className={`flex-1 max-w-[120px] px-4 py-3 rounded-xl font-semibold shadow-lg transition-all ${
              activeShop === 'stats'
                ? 'bg-primary text-primary-foreground scale-105'
                : 'bg-background/95 backdrop-blur border-2 hover:scale-105'
            }`}
          >
            📊 Stats
          </button>
        </div>

        {/* Mobile Drawer - Slide up from bottom */}
        {activeShop && (
          <>
            {/* Backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in"
              onClick={() => setActiveShop(null)}
            />

            {/* Drawer */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              {/* Handle */}
              <div className="sticky top-0 bg-background pt-3 pb-2 px-4 border-b z-10">
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {activeShop === 'tower' && '🏰 Tower Shop'}
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
                {activeShop === 'tower' && <TowerShop game={game} />}
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
