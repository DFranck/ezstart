/* path: /components/BaguaWheel.tsx */
'use client'

import { Direction, DIRECTIONS } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { calculateBaguaRotation } from '@/utils/baguaRotation'
import { useId, useMemo, useRef, useState } from 'react'

type CardsMode = 'hover' | 'all'

type BaguaWheelProps = {
  src: string
  bearingFromNorth: number
  size?: number
  radiusPct?: number
  insetRatio?: number
  config?: YearBaguaConfig
  /** distance supplémentaire des labels vs le cercle (peut être négative) */
  labelOffset?: number
  /** 'hover' (par défaut) = 1 seule card; 'all' = toutes les cards */
  cardsMode?: CardsMode
  cardsRadiusPct?: number
}

function degToRad(d: number) {
  return (d * Math.PI) / 180
}

function sectorPath(
  startDegFromNorth: number,
  endDegFromNorth: number,
  r: number,
  cx: number,
  cy: number
) {
  const svgStart = 90 - startDegFromNorth
  const svgEnd = 90 - endDegFromNorth
  const x1 = cx + r * Math.cos(degToRad(svgStart))
  const y1 = cy - r * Math.sin(degToRad(svgStart))
  const x2 = cx + r * Math.cos(degToRad(svgEnd))
  const y2 = cy - r * Math.sin(degToRad(svgEnd))
  const largeArc = Math.abs(endDegFromNorth - startDegFromNorth) > 180 ? 1 : 0
  const sweep = 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2} Z`
}

function applyRotation(x: number, y: number, cx: number, cy: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  }
}

export default function BaguaWheel({
  src,
  bearingFromNorth,
  size = 560,
  radiusPct = 46,
  insetRatio = 1.0,
  config,
  labelOffset = 6,
  cardsMode = 'hover',
  cardsRadiusPct,
}: BaguaWheelProps) {
  const clipId = useId()
  const cx = 50
  const cy = 50
  const r = radiusPct

  const rot = useMemo(() => {
    const result = calculateBaguaRotation(bearingFromNorth, config)
    return result
  }, [bearingFromNorth, config])

  // image centrée/insérée dans le cercle
  const s = Math.min(r * Math.SQRT2 * insetRatio, 100)
  const imgX = cx - s / 2
  const imgY = cy - s / 2

  // rayon des labels/cards (limité pour ne pas sortir du viewbox)
  const baseLabelR = r + labelOffset
  const labelR = Math.min(baseLabelR, 45)
  const cardR = cardsRadiusPct ?? labelR

  // état hover/pin inchangé
  const [hoverLabelDir, setHoverLabelDir] = useState<Direction | null>(null)
  const [pinnedDir, setPinnedDir] = useState<Direction | null>(null)
  const activeDir = pinnedDir ?? hoverLabelDir
  const hoverTimeout = useRef<number | null>(null)

  const clearHoverSoon = () => {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
    hoverTimeout.current = window.setTimeout(() => {
      if (!pinnedDir) setHoverLabelDir(null)
    }, 60)
  }

  const labelPos = (i: number) => {
    const a = i * 45
    const svgA = 90 - a
    const tx = cx + labelR * Math.cos(degToRad(svgA))
    const ty = cy - labelR * Math.sin(degToRad(svgA))
    return { a, tx, ty }
  }

  // 👉 position des CARDS (au rayon cardR), puis passage en repère global via rot
  const cardPosGlobal = useMemo(() => {
    return DIRECTIONS.map((dir, i) => {
      const a = i * 45
      const svgA = 90 - a
      const tx = cx + cardR * Math.cos(degToRad(svgA))
      const ty = cy - cardR * Math.sin(degToRad(svgA))
      const { x, y } = applyRotation(tx, ty, cx, cy, rot)
      return { dir, xPct: x, yPct: y }
    })
  }, [cardR, rot])

  // positions pré-calculées en repère GLOBAL (post-rotation) pour placer les cards
  const cardsPositions = useMemo(() => {
    return DIRECTIONS.map((dir, i) => {
      const { a, tx, ty } = labelPos(i)
      const p = applyRotation(tx, ty, cx, cy, rot)
      return { dir, a, xPct: p.x, yPct: p.y }
    })
  }, [rot]) // labelR, cx, cy et r ne bougent pas pendant le rendu

  return (
    <div
      className="mx-auto  backdrop-blur rounded-2xl shadow-xl border  p-6"
      style={{ width: size }}
    >
      <div
        className="relative"
        onMouseLeave={() => {
          if (!pinnedDir) setHoverLabelDir(null)
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-auto" role="img" aria-label="Roue Bagua">
          <defs>
            <clipPath id={clipId}>
              <circle cx={cx} cy={cy} r={r} />
            </clipPath>
          </defs>

          <image
            href={src}
            x={imgX}
            y={imgY}
            width={s}
            height={s}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#${clipId})`}
            data-bagua="plan"
          />

          {/* Overlay tourné (triangles + labels) */}
          <g transform={`rotate(${rot}, ${cx}, ${cy})`} data-bagua="overlay">
            {DIRECTIONS.map((_, i) => {
              const start = i * 45 - 22.5
              const end = (i + 1) * 45 - 22.5
              return (
                <path
                  key={i}
                  d={sectorPath(start, end, r, cx, cy)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.4}
                  strokeDasharray="2 3"
                  className="text-foreground opacity-30"
                />
              )
            })}

            {/* Labels interactifs */}
            {DIRECTIONS.map((dir: Direction, i) => {
              const { a, tx, ty } = labelPos(i)
              return (
                <text
                  key={dir}
                  x={tx}
                  y={ty}
                  fontSize={4}
                  fontWeight={800}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="black"
                  stroke="white"
                  strokeWidth={0.6}
                  paintOrder="stroke"
                  transform={`rotate(${a}, ${tx}, ${ty})`}
                  onMouseEnter={() => {
                    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
                    setHoverLabelDir(dir)
                  }}
                  onMouseLeave={clearHoverSoon}
                  onClick={() => setPinnedDir(curr => (curr === dir ? null : dir))}
                  style={{ cursor: 'pointer' }}
                >
                  {dir}
                </text>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}
