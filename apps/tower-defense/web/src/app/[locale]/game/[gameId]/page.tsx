'use client'

import { useGameState } from '@/stores/useGameState'
import { callApi } from '@/utils/api'
import { Div, Spinner } from '@ezstart/ui/components'
import { Game } from '@tower-defense/types'
import dynamic from 'next/dynamic'
import { notFound, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GameCanvasCanvas } from '../components/GameCanvasCanvas'
import { GameInitializer } from '../components/GameInitializer'
import { Hud } from '../components/Hud'

// Dynamic imports for heavy game components (~630 lines total)
// TowerShop (240 lines) and MobShop (187 lines) are only shown when game is active
// Reduces initial bundle size and improves First Load JS
const TowerShop = dynamic(() => import('../components/TowerShop').then(mod => ({ default: mod.TowerShop })), {
  loading: () => <div className="animate-pulse bg-muted rounded-lg h-32" />,
})
const MobShop = dynamic(() => import('../components/MobShop').then(mod => ({ default: mod.MobShop })), {
  loading: () => <div className="animate-pulse bg-muted rounded-lg h-32" />,
})

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
        <Spinner variant="fancy" size="xl" text="Loading game..." textSize="md" />
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
        <Hud />

        {/* Main Game Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas - Full width on mobile, flexible on desktop */}
          <div className="flex-1 relative overflow-auto flex justify-center mb-32 lg:mb-0">
            <GameCanvasCanvas />
            <Div layout="col" className="lg:hidden fixed bottom-0">
              <MobShop game={game} />
              <TowerShop game={game} />
            </Div>
            {/* Desktop Sidebar - Hidden on mobile */}
            <div className="hidden lg:flex md:w-[320px] flex-col gap-4 p-4 bg-background/95 backdrop-blur border-l overflow-y-auto">
              <TowerShop game={game} />
              <MobShop game={game} />
            </div>
          </div>
        </div>

        {/* Mobile Tower Bar - Always visible at bottom */}
        <div
          className={`md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-40 bg-background/95 backdrop-blur border-t shadow-lg transition-opacity w-full max-w-[600px] ${
            draggedTower ? 'pointer-events-none opacity-50' : ''
          }`}
        ></div>

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
                  <h3 className="text-lg font-bold">{activeShop === 'mob' && '👾 Mob Shop'}</h3>
                  <button
                    onClick={() => setActiveShop(null)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
            </div>
          </>
        )}
      </div>
    </>
  )
}
