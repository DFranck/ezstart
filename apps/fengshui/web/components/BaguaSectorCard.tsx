'use client'

import type { Direction } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'

type Props = {
  dir: Direction
  cfg: YearBaguaConfig
  /** Position en pourcents du viewBox (0..100) */
  xPct: number
  yPct: number
  /** Décalage px depuis le point (pour éviter de chevaucher le label) */
  offset?: { x?: number; y?: number }
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function BaguaSectorCard({
  dir,
  cfg,
  xPct,
  yPct,
  offset,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const s = cfg.sectors[dir]
  if (!s) return null

  return (
    <div
      className="pointer-events-auto absolute z-20"
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className="max-w-xs rounded-xl border border-black/10 bg-white/90 backdrop-blur p-3 shadow-xl"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="mb-1 text-xs font-semibold text-gray-500">{dir}</div>
        <div className="text-sm font-bold text-gray-800">{s.title}</div>
        <div className="text-xs font-medium text-gray-600 mb-2">{s.element}</div>
        {s.summary && <p className="text-xs text-gray-600 mb-2">{s.summary}</p>}
        {s.tips?.length ? (
          <ul className="list-disc pl-4 space-y-0.5">
            {s.tips.map((tip, i) => (
              <li key={i} className="text-xs text-gray-700">
                {tip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
