'use client'

import { BAGUA_SECTORS, Transformations } from '@/types/bagua'
import { Direction, DIRECTIONS, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { calculateBaguaRotation } from '@/utils/baguaRotation'
import { useMemo, useState } from 'react'
import { Div } from '@ezstart/ui/components'

type CardsMode = 'hover' | 'all'

type BaguaGridProps = {
  src: string
  bearingFromNorth: number
  size?: number
  config?: YearBaguaConfig
  /** 'hover' (par défaut) = 1 seule card; 'all' = toutes les cards */
  cardsMode?: CardsMode
  /** Transformations du crop pour adapter la forme */
  transformations?: Transformations
  /** Callback appelé quand on clique sur un secteur */
  onSectorClick?: (direction: Direction) => void
}

// Mapping des directions vers les positions de la grille 3x3 (position de base, avant rotation)
// Organisation standard Feng Shui : N en haut, S en bas, E à droite, O à gauche
const GRID_POSITIONS_BASE: Record<Direction, { row: number; col: number }> = {
  NO: { row: 0, col: 0 }, // Haut-Gauche
  N: { row: 0, col: 1 }, // Haut-Centre
  NE: { row: 0, col: 2 }, // Haut-Droite
  O: { row: 1, col: 0 }, // Centre-Gauche
  C: { row: 1, col: 1 }, // Centre
  E: { row: 1, col: 2 }, // Centre-Droite
  SO: { row: 2, col: 0 }, // Bas-Gauche
  S: { row: 2, col: 1 }, // Bas-Centre
  SE: { row: 2, col: 2 }, // Bas-Droite
}

// Fonction pour obtenir la position dans la grille d'une direction selon le bearing
function getGridPositionForDirection(direction: Direction, rotation: number) {
  if (direction === 'C') {
    return GRID_POSITIONS_BASE['C'] // Le centre ne bouge jamais
  }

  // Si pas de rotation significative, retourner la position de base
  if (Math.abs(rotation) < 1) {
    return GRID_POSITIONS_BASE[direction]
  }

  // LOGIQUE SIMPLIFIEE comme BaguaWheel
  // rotation = bearing direct, on applique la même logique
  const rotationSteps = Math.round(rotation / 45) % 8

  // Index de base de la direction (N=0, NE=1, E=2, etc.)
  const baseIndex = DIRECTIONS.indexOf(direction as any)
  if (baseIndex === -1) return GRID_POSITIONS_BASE[direction]

  // MÊME LOGIQUE QUE WHEEL: rotation directe dans le même sens
  const rotatedIndex = (baseIndex + rotationSteps) % 8
  const rotatedDirection = DIRECTIONS[rotatedIndex]

  return GRID_POSITIONS_BASE[rotatedDirection as Direction]
}

// Conversion des directions vers les IDs des secteurs Bagua
const DIRECTION_TO_SECTOR_ID: Record<Direction, string> = {
  N: 'N',
  NE: 'NE',
  E: 'E',
  SE: 'SE',
  S: 'S',
  SO: 'SO',
  O: 'O',
  NO: 'NO',
  C: 'CENTER',
}
export default function BaguaGrid({
  src,
  bearingFromNorth,
  size = 560,
  config,
  cardsMode = 'hover',
  transformations,
  onSectorClick,
}: BaguaGridProps) {
  const [hoverSector, setHoverSector] = useState<Direction | null>(null)
  const [pinnedSector, setPinnedSector] = useState<Direction | null>(null)
  const activeSector = pinnedSector ?? hoverSector
  // Helper pour obtenir la couleur d'une direction depuis la config
  const getSectorColor = (dir: Direction): string => {
    if (!config?.orientations?.[dir]) return '#ef4444'
    const colorHex = config.orientations[dir].colorHex
    const colorHexes = config.orientations[dir].colorHexes
    return colorHex || colorHexes?.[0] || '#ef4444'
  }
  // Calcul de la rotation avec la même fonction que BaguaWheel
  const rotation = useMemo(() => {
    const result = calculateBaguaRotation(bearingFromNorth, config)
    return result
  }, [bearingFromNorth, config])

  return (
    <Div className="mx-auto ">
      <Div className="relative ">
        {/* Plan en taille maximale avec ratio conservé */}
        <Div className="w-full relative overflow-hidden">
          <img src={src} alt="Plan Bagua" className="w-full h-auto object-contain" />

          {/* Grille 3x3 overlay absolute */}
          <Div
            className="absolute inset-0 grid grid-cols-3"
            onMouseLeave={() => {
              if (!pinnedSector) setHoverSector(null)
            }}
          >
            {/* Secteurs interactifs avec positions rotées */}
            {DIRECTIONS_WITH_CENTER.map(direction => {
              const position = getGridPositionForDirection(direction, rotation)
              const sectorId = DIRECTION_TO_SECTOR_ID[direction]
              const sector = BAGUA_SECTORS.find(s => s.id === sectorId)

              if (!sector || !position) return null

              const isActive = activeSector === direction
              const isHovered = hoverSector === direction
              const sectorColor = getSectorColor(direction)

              const bgColor = sectorColor + (isHovered ? '9D' : '6D')

              return (
                <Div
                  key={direction}
                  className="relative cursor-pointer transition-all duration-200"
                  style={{
                    gridRow: position.row + 1,
                    gridColumn: position.col + 1,
                    backgroundColor: bgColor,
                    borderWidth: '0.5px',
                    borderStyle: 'dashed',
                    borderColor: '#ef444460',
                  }}
                  onMouseEnter={() => setHoverSector(direction)}
                  onMouseLeave={() => {
                    if (!pinnedSector) setHoverSector(null)
                  }}
                  onClick={() => {
                    // Si on a un callback externe, l'utiliser au lieu du comportement par défaut
                    if (onSectorClick) {
                      onSectorClick(direction)
                    } else {
                      setPinnedSector(curr => (curr === direction ? null : direction))
                    }
                  }}
                >
                  {/* Label direction top-left */}
                  <Div
                    className="absolute top-1 left-1 text-white font-bold text-sm px-1 py-0.5 rounded bg-black/70"
                    style={{
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {direction === 'C' ? 'C' : direction}
                  </Div>
                </Div>
              )
            })}
          </Div>
        </Div>
      </Div>
    </Div>
  )
}
