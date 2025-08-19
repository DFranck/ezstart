'use client'

import { Direction, DIRECTIONS } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { useId, useMemo, useRef, useState } from 'react'
import BaguaSectorCard from '../BaguaSectorCard'

type BaguaWheelProps = {
  src: string
  bearingFromNorth: number
  size?: number
  radiusPct?: number
  insetRatio?: number
  config?: YearBaguaConfig
  /** distance supplémentaire des labels vs le cercle (peut être négative) */
  labelOffset?: number
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

export default function BaguaWheel({
  src,
  bearingFromNorth,
  size = 560,
  radiusPct = 46,
  insetRatio = 1.0,
  config,
  labelOffset = 6,
}: BaguaWheelProps) {
  const clipId = useId()
  const cx = 50
  const cy = 50
  const r = radiusPct

  const rot = useMemo(
    () => (((bearingFromNorth % 360) + 360) % 360) + (config?.rotationOffsetDeg ?? 0),
    [bearingFromNorth, config?.rotationOffsetDeg]
  )

  const s = Math.min(r * Math.SQRT2 * insetRatio, 100)
  const imgX = cx - s / 2
  const imgY = cy - s / 2

  const baseLabelR = r + labelOffset
  const labelR = Math.min(baseLabelR, 45)

  // uniquement labels interactifs
  const [hoverLabelDir, setHoverLabelDir] = useState<Direction | null>(null)
  const [pinnedDir, setPinnedDir] = useState<Direction | null>(null)
  const activeDir = pinnedDir ?? hoverLabelDir
  function applyRotation(x: number, y: number, cx: number, cy: number, deg: number) {
    const rad = (deg * Math.PI) / 180
    const dx = x - cx
    const dy = y - cy
    return {
      x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
    }
  }
  const hoverTimeout = useRef<number | null>(null)
  const clearHover = () => {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
    hoverTimeout.current = window.setTimeout(() => {
      if (!pinnedDir) setHoverLabelDir(null)
    }, 60) // 60–100ms
  }

  const labelPos = (i: number) => {
    const a = i * 45
    const svgA = 90 - a
    const tx = cx + labelR * Math.cos(degToRad(svgA))
    const ty = cy - labelR * Math.sin(degToRad(svgA))
    return { a, tx, ty }
  }

  return (
    <div
      className="mx-auto bg-white/70 backdrop-blur rounded-2xl shadow-xl border border-white/20 p-6"
      style={{ width: size }}
    >
      <div
        className="relative" // wrapper de positionnement de la card
        onMouseLeave={() => {
          // sort vraiment de la zone
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

          {/* Overlay tourné */}
          <g transform={`rotate(${rot}, ${cx}, ${cy})`} data-bagua="overlay">
            {DIRECTIONS.map((_, i) => {
              const start = i * 45 - 22.5
              const end = (i + 1) * 45 - 22.5
              return (
                <path
                  key={i}
                  d={sectorPath(start, end, r, cx, cy)}
                  fill="none"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth={0.4}
                  strokeDasharray="2 3"
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
                  onMouseLeave={clearHover}
                  onClick={() => setPinnedDir(curr => (curr === dir ? null : dir))}
                  style={{ cursor: 'pointer' }}
                >
                  {dir}
                </text>
              )
            })}
          </g>
        </svg>

        {activeDir &&
          config &&
          (() => {
            const i = DIRECTIONS.indexOf(activeDir)
            const { tx, ty } = labelPos(i)

            // Appliquer la rotation pour passer au repère global
            const { x, y } = applyRotation(tx, ty, cx, cy, rot)

            return (
              <BaguaSectorCard
                dir={activeDir}
                cfg={config}
                xPct={x}
                yPct={y}
                offset={{ x: 0, y: 0 }}
                onMouseEnter={() => {
                  if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
                  setHoverLabelDir(activeDir)
                }}
                onMouseLeave={clearHover}
              />
            )
          })()}
      </div>
      <p className="mt-3 text-center text-sm text-gray-600">
        Orientation : <strong>{Math.round(rot)}°</strong> depuis le Nord.
      </p>
    </div>
  )
}
