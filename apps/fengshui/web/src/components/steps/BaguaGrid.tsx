'use client'

import { BAGUA_SECTORS, Transformations } from '@/types/bagua'
import { Direction, DIRECTIONS, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { calculateBaguaRotation } from '@/utils/baguaRotation'
import { useMemo, useState } from 'react'

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

  // Calcul de la rotation avec la même fonction que BaguaWheel
  const rotation = useMemo(() => {
    const result = calculateBaguaRotation(bearingFromNorth, config)
    return result
  }, [bearingFromNorth, config])

  // Calcul de l'aspect ratio basé sur le crop
  const aspectRatio = transformations?.crop
    ? transformations.crop.width / transformations.crop.height
    : 1 // Par défaut carré si pas de crop

  return (
    <div className="mx-auto backdrop-blur shadow-xl border p-2 rounded">
      <div className="relative">
        {/* Plan en taille maximale avec ratio conservé */}
        <div className="w-full relative overflow-hidden">
          <img src={src} alt="Plan Bagua" className="w-full h-auto object-contain" />

          {/* Grille 3x3 overlay absolute */}
          <div
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

              return (
                <div
                  key={direction}
                  className="relative cursor-pointer transition-all duration-200 border"
                  style={{
                    gridRow: position.row + 1,
                    gridColumn: position.col + 1,
                    backgroundColor: isActive ? `${sector.color}30` : 'rgba(0,0,0,0.1)',
                    borderColor: isActive
                      ? sector.color
                      : isHovered
                        ? sector.color
                        : 'rgba(255,255,255,0.3)',
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
                  <div
                    className="absolute top-1 left-1 text-white font-bold text-sm px-1 py-0.5 rounded bg-black/70"
                    style={{
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {direction === 'C' ? 'C' : direction}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Informations du secteur actif */}
        {activeSector && (
          <div className="mt-4 p-4 bg-background/90 backdrop-blur rounded-lg border">
            {(() => {
              const sectorId = DIRECTION_TO_SECTOR_ID[activeSector]
              const sector = BAGUA_SECTORS.find(s => s.id === sectorId)
              if (!sector) return null

              return (
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {sector.name} ({activeSector})
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Élément: {sector.element} • Direction: {sector.direction}
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
