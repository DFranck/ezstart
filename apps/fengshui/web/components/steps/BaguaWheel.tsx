/* path: /components/visuals/BaguaWheel.tsx */
'use client'

import { useId } from 'react'

type BaguaWheelProps = {
  /** URL/base64 du plan (upload step 1) */
  src: string
  /** 0° = Nord (sens horaire). Vient de l’étape 2 */
  bearingFromNorth: number
  /** Taille en px du SVG (carré) */
  size?: number
  /** Radius visuel du disque (en % du viewBox) */
  radiusPct?: number
}

const SECTORS = [
  { id: 'NO', label: 'NO', color: '#ff77b4' },
  { id: 'N', label: 'N', color: '#ff9aa2' },
  { id: 'NE', label: 'NE', color: '#f4c27f' },
  { id: 'E', label: 'E', color: '#ffd84a' },
  { id: 'SE', label: 'SE', color: '#b9f77b' },
  { id: 'S', label: 'S', color: '#7be3c8' },
  { id: 'SO', label: 'SO', color: '#7cb5ff' },
  { id: 'O', label: 'O', color: '#b49cff' },
] as const

function degToRad(d: number) {
  return (d * Math.PI) / 180
}

/**
 * Secteur (pizza slice) : centre -> arc -> centre
 * Les angles sont donnés dans un repère "Nord=0°", horaire.
 * Ce helper convertit vers le repère SVG (0° = Est, anti-horaire).
 */
function sectorPath(
  startDegFromNorth: number,
  endDegFromNorth: number,
  r: number,
  cx: number,
  cy: number
) {
  // convertit vers repère SVG (0°=Est, sens anti-horaire)
  const svgStart = 90 - startDegFromNorth
  const svgEnd = 90 - endDegFromNorth

  const x1 = cx + r * Math.cos(degToRad(svgStart))
  const y1 = cy - r * Math.sin(degToRad(svgStart))
  const x2 = cx + r * Math.cos(degToRad(svgEnd))
  const y2 = cy - r * Math.sin(degToRad(svgEnd))

  const largeArc = Math.abs(endDegFromNorth - startDegFromNorth) > 180 ? 1 : 0
  const sweep = 0 /* anti-horaire dans le repère SVG */

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2} Z`
}

export default function BaguaWheel({
  src,
  bearingFromNorth,
  size = 560,
  radiusPct = 46, // cercle légèrement bordé dans le viewBox 100x100
}: BaguaWheelProps) {
  const clipId = useId()
  const cx = 50
  const cy = 50
  const r = radiusPct

  // On ne tourne **pas** l'image : elle reste fixe.
  // On tourne le groupe "axes + secteurs" de `bearingFromNorth` degrés
  // afin que le Nord de la roue corresponde au Nord choisi à l'étape 2.
  const rot = ((bearingFromNorth % 360) + 360) % 360

  return (
    <div
      className="mx-auto bg-white/70 backdrop-blur rounded-2xl shadow-xl border border-white/20 p-6"
      style={{ width: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-auto"
        role="img"
        aria-label="Roue Bagua orientée selon le Nord choisi"
      >
        {/* Masque circulaire pour le plan */}
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* Image du plan, recadrée au disque */}
        <image
          href={src}
          x={0}
          y={0}
          width={100}
          height={100}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          data-bagua="plan"
        />

        {/* Cercle externe */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={0.8} />

        {/* Groupe tourné selon le bearing */}
        <g transform={`rotate(${rot}, ${cx}, ${cy})`} data-bagua="overlay">
          {/* 8 secteurs de 45° (Nord démarrant à 0°) */}
          {SECTORS.map((s, i) => {
            const start = i * 45
            const end = (i + 1) * 45
            return (
              <path
                key={s.id}
                d={sectorPath(start, end, r, cx, cy)}
                fill={s.color}
                fillOpacity={0.38}
                stroke="rgba(0,0,0,0.3)"
                strokeDasharray="2,2"
                data-sector={s.id}
              />
            )
          })}

          {/* Axes N/E/S/O */}
          {[
            { a: 0, id: 'N' },
            { a: 90, id: 'E' },
            { a: 180, id: 'S' },
            { a: 270, id: 'O' },
          ].map(({ a, id }) => {
            // Convertit vers SVG (0°=Est/anti-horaire)
            const svgA = 90 - a
            const x = cx + r * Math.cos(degToRad(svgA))
            const y = cy - r * Math.sin(degToRad(svgA))
            return (
              <g key={id}>
                <line x1={cx} y1={cy} x2={x} y2={y} stroke="black" strokeWidth={0.8} />
                {/* label à 85% du rayon */}
                <text
                  x={cx + r * 0.78 * Math.cos(degToRad(svgA))}
                  y={cy - r * 0.78 * Math.sin(degToRad(svgA))}
                  fontSize={3.6}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="black"
                >
                  {id}
                </text>
              </g>
            )
          })}

          {/* Diagonales NE/SE/SO/NO */}
          {[45, 135, 225, 315].map(a => {
            const svgA = 90 - a
            const x = cx + r * Math.cos(degToRad(svgA))
            const y = cy - r * Math.sin(degToRad(svgA))
            return (
              <line
                key={a}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={0.6}
              />
            )
          })}

          {/* centre */}
          <circle cx={cx} cy={cy} r={1.2} fill="black" />
        </g>
      </svg>

      <p className="mt-3 text-center text-sm text-gray-600">
        La roue est orientée selon <strong>{Math.round(rot)}°</strong> depuis le Nord.
      </p>
    </div>
  )
}
