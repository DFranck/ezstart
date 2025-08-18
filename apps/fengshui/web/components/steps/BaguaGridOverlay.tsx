/* path: /components/visuals/BaguaGridOverlay.tsx */
'use client'

import type { GridStyle } from '@/types/bagua'
import { useMemo } from 'react'

type BaguaGridOverlayProps = {
  /** image du plan (upload step) */
  src: string
  /** 0° = Nord, sens horaire. On tourne l’overlay avec cette valeur. */
  bearingFromNorth: number
  /** style de la grille : carré ou losange (+45°) */
  style?: GridStyle
  /** afficher les labels dans chaque case */
  showLabels?: boolean
}

const CELL = 33.33

export default function BaguaGridOverlay({
  src,
  bearingFromNorth,
  style = 'square',
  showLabels = true,
}: BaguaGridOverlayProps) {
  const rot = ((bearingFromNorth % 360) + 360) % 360
  const extra = style === 'diamond' ? 45 : 0
  const svgRotation = (rot + extra) % 360

  // positions des 9 cellules + libellés
  const cells = useMemo(
    () => [
      { x: 0, y: 0, id: 'NO', fill: '#ff0088' },
      { x: CELL, y: 0, id: 'N', fill: '#ff4444' },
      { x: CELL * 2, y: 0, id: 'NE', fill: '#ff8800' },
      { x: 0, y: CELL, id: 'O', fill: '#8800ff' },
      { x: CELL, y: CELL, id: 'C', fill: '#cccccc' },
      { x: CELL * 2, y: CELL, id: 'E', fill: '#ffd700' },
      { x: 0, y: CELL * 2, id: 'SO', fill: '#0088ff' },
      { x: CELL, y: CELL * 2, id: 'S', fill: '#00ff88' },
      { x: CELL * 2, y: CELL * 2, id: 'SE', fill: '#88ff00' },
    ],
    []
  )

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* plan en fond */}
      <img
        src={src}
        alt="Plan de base"
        className="w-full h-auto rounded-lg border-2 border-gray-300"
      />

      {/* overlay 3×3 */}
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ transform: `rotate(${svgRotation}deg)`, transformOrigin: 'center' }}
          role="img"
          aria-label={`Grille Bagua ${style}`}
        >
          {/* lignes */}
          <line
            x1={CELL}
            y1="0"
            x2={CELL}
            y2="100"
            stroke="#666"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          <line
            x1={CELL * 2}
            y1="0"
            x2={CELL * 2}
            y2="100"
            stroke="#666"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          <line
            x1="0"
            y1={CELL}
            x2="100"
            y2={CELL}
            stroke="#666"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          <line
            x1="0"
            y1={CELL * 2}
            x2="100"
            y2={CELL * 2}
            stroke="#666"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />

          {/* cellules */}
          {cells.map(c => (
            <g key={`${c.id}-${c.x}-${c.y}`}>
              <rect x={c.x} y={c.y} width={CELL} height={CELL} fill={c.fill} fillOpacity="0.3" />
              {showLabels && (
                <text
                  x={c.x + CELL / 2}
                  y={c.y + CELL * 0.6}
                  textAnchor="middle"
                  fontSize="3"
                  fill="#000"
                  fontWeight="bold"
                >
                  {c.id}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
