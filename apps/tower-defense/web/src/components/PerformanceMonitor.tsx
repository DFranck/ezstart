/**
 * Performance Monitor Component
 *
 * Displays real-time performance metrics in an overlay.
 * Optimized for multiplayer - shows per-player entity counts.
 *
 * Toggle with F3 key (Minecraft-style)
 */

'use client'

import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { useEffect, useState } from 'react'

interface PerformanceMonitorProps {
  /** Total number of entities in the game */
  totalMobs?: number
  totalTowers?: number
  totalProjectiles?: number
  /** Per-player breakdown */
  players?: Array<{
    name: string
    mobs: number
    towers: number
    hp: number
  }>
  /** Network stats (optional) */
  ping?: number
  /** Game tick rate */
  tickRate?: number
}

export function PerformanceMonitor({
  totalMobs = 0,
  totalTowers = 0,
  totalProjectiles = 0,
  players = [],
  ping,
  tickRate = 4,
}: PerformanceMonitorProps) {
  const [visible, setVisible] = useState(false)
  const [detailed, setDetailed] = useState(false)
  const metrics = usePerformanceMonitor(visible)

  // Toggle with F3 key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setVisible(v => !v)
      }
      // Shift+F3 for detailed mode
      if (e.key === 'F3' && e.shiftKey) {
        e.preventDefault()
        setDetailed(d => !d)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!visible) return null

  // Performance status color
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    if (fps >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  const slowFramePercent = metrics.totalFrames > 0 ? ((metrics.slowFrames / metrics.totalFrames) * 100).toFixed(1) : '0.0'
  const droppedFramePercent = metrics.totalFrames > 0 ? ((metrics.droppedFrames / metrics.totalFrames) * 100).toFixed(1) : '0.0'

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none select-none">
      <div className="bg-black/80 text-white rounded-lg p-3 font-mono text-xs backdrop-blur-sm border border-white/20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 border-b border-white/20 pb-2">
          <div className="font-bold text-sm">🎮 Performance</div>
          <div className="text-[10px] text-gray-400">F3: Toggle | Shift+F3: Details</div>
        </div>

        {/* FPS Stats */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-gray-400">FPS:</span>
            <span className={`font-bold text-base ${getFpsColor(metrics.fps)}`}>
              {metrics.fps}
              <span className="text-[10px] text-gray-500 ml-1">
                ({metrics.minFps}-{metrics.maxFps})
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-6">
            <span className="text-gray-400">Frame Time:</span>
            <span className="text-gray-200">
              {metrics.avgFrameTime}ms
              <span className="text-[10px] text-gray-500 ml-1">(max: {metrics.maxFrameTime}ms)</span>
            </span>
          </div>

          {detailed && (
            <>
              <div className="flex items-center justify-between gap-6 text-[10px]">
                <span className="text-gray-400">Slow Frames:</span>
                <span className={metrics.slowFrames > 0 ? 'text-yellow-400' : 'text-gray-400'}>
                  {metrics.slowFrames} ({slowFramePercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 text-[10px]">
                <span className="text-gray-400">Dropped Frames:</span>
                <span className={metrics.droppedFrames > 0 ? 'text-red-400' : 'text-gray-400'}>
                  {metrics.droppedFrames} ({droppedFramePercent}%)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Entities */}
        <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-gray-400">Entities:</span>
            <span className="text-cyan-300 font-bold">{totalMobs + totalTowers + totalProjectiles}</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-gray-500 ml-2">- Mobs:</span>
            <span className="text-red-400">{totalMobs}</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-gray-500 ml-2">- Towers:</span>
            <span className="text-blue-400">{totalTowers}</span>
          </div>
          {totalProjectiles > 0 && (
            <div className="flex items-center justify-between gap-6 text-[10px]">
              <span className="text-gray-500 ml-2">- Projectiles:</span>
              <span className="text-yellow-400">{totalProjectiles}</span>
            </div>
          )}
        </div>

        {/* Multiplayer Stats */}
        {players.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
            <div className="text-gray-400 font-semibold text-[10px] mb-1">Players ({players.length}):</div>
            {players.slice(0, detailed ? undefined : 4).map((player, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-gray-300 truncate max-w-[80px]" title={player.name}>
                  {player.name}
                </span>
                <div className="flex gap-2 text-[9px]">
                  <span className="text-red-400">{player.mobs}M</span>
                  <span className="text-blue-400">{player.towers}T</span>
                  <span className={player.hp > 10 ? 'text-green-400' : 'text-red-500'}>
                    {player.hp}❤️
                  </span>
                </div>
              </div>
            ))}
            {!detailed && players.length > 4 && (
              <div className="text-[9px] text-gray-500 text-center">+{players.length - 4} more...</div>
            )}
          </div>
        )}

        {/* Network & Game Stats */}
        {detailed && (
          <div className="mt-2 pt-2 border-t border-white/20 space-y-1 text-[10px]">
            {ping !== undefined && (
              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-400">Ping:</span>
                <span className={ping < 50 ? 'text-green-400' : ping < 100 ? 'text-yellow-400' : 'text-red-400'}>
                  {ping}ms
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-6">
              <span className="text-gray-400">Tick Rate:</span>
              <span className="text-gray-300">{tickRate} Hz</span>
            </div>
            {metrics.memoryMB !== null && (
              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-400">Memory:</span>
                <span className="text-gray-300">{metrics.memoryMB} MB</span>
              </div>
            )}
          </div>
        )}

        {/* Performance Verdict */}
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="flex items-center justify-center text-[10px] font-semibold">
            {metrics.fps >= 55 && <span className="text-green-400">✅ EXCELLENT</span>}
            {metrics.fps >= 45 && metrics.fps < 55 && <span className="text-yellow-400">⚠️ GOOD</span>}
            {metrics.fps >= 30 && metrics.fps < 45 && <span className="text-orange-400">❌ POOR</span>}
            {metrics.fps < 30 && <span className="text-red-400">🔴 CRITICAL</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
