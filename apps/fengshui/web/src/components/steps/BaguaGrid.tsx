'use client'

import { Direction, DIRECTIONS, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { BAGUA_SECTORS, Transformations } from '@/types/bagua'
import { useState, useMemo } from 'react'

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
}

// Mapping des directions vers les positions de la grille 3x3 (position de base, avant rotation)
// Organisation standard Feng Shui : N en haut, S en bas, E à droite, O à gauche
const GRID_POSITIONS_BASE: Record<Direction, { row: number; col: number }> = {
  'NO': { row: 0, col: 0 }, // Haut-Gauche
  'N': { row: 0, col: 1 },  // Haut-Centre
  'NE': { row: 0, col: 2 }, // Haut-Droite
  'O': { row: 1, col: 0 },  // Centre-Gauche
  'C': { row: 1, col: 1 },  // Centre
  'E': { row: 1, col: 2 },  // Centre-Droite
  'SO': { row: 2, col: 0 }, // Bas-Gauche
  'S': { row: 2, col: 1 },  // Bas-Centre
  'SE': { row: 2, col: 2 }, // Bas-Droite
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

  // Application de la rotation - dans BaguaWheel l'overlay tourne avec transform rotate(rot)
  const rotationSteps = Math.round(rotation / 45) % 8

  // Index de base de la direction (N=0, NE=1, E=2, etc.)
  const baseIndex = DIRECTIONS.indexOf(direction as any)
  if (baseIndex === -1) return GRID_POSITIONS_BASE[direction]

  // CORRECTION: Pour maintenir l'alignement avec BaguaWheel
  // La grille doit appliquer la rotation dans le MÊME sens (pas inverse)
  const rotatedIndex = (baseIndex + rotationSteps) % 8
  const rotatedDirection = DIRECTIONS[rotatedIndex]

  return GRID_POSITIONS_BASE[rotatedDirection as Direction]
}

// Conversion des directions vers les IDs des secteurs Bagua
const DIRECTION_TO_SECTOR_ID: Record<Direction, string> = {
  'N': 'N',
  'NE': 'NE',
  'E': 'E',
  'SE': 'SE',
  'S': 'S',
  'SO': 'SO',
  'O': 'O',
  'NO': 'NO',
  'C': 'CENTER',
}

export default function BaguaGrid({
  src,
  bearingFromNorth,
  size = 560,
  config,
  cardsMode = 'hover',
  transformations,
}: BaguaGridProps) {
  const [hoverSector, setHoverSector] = useState<Direction | null>(null)
  const [pinnedSector, setPinnedSector] = useState<Direction | null>(null)
  const activeSector = pinnedSector ?? hoverSector

  // Calcul de la rotation pour aligner les secteurs avec le bearing (comme dans BaguaWheel)
  const rotation = useMemo(() => {
    // Même logique que BaguaWheel : rotation inverse pour repositionner les secteurs
    const rot = (-bearingFromNorth + 90) + (config?.rotationOffsetDeg ?? 0)
    return ((rot % 360) + 360) % 360
  }, [bearingFromNorth, config?.rotationOffsetDeg])

  // Calcul de l'aspect ratio basé sur le crop
  const aspectRatio = transformations?.crop
    ? transformations.crop.width / transformations.crop.height
    : 1 // Par défaut carré si pas de crop

  return (
    <div
      className="mx-auto backdrop-blur rounded-2xl shadow-xl border p-6"
      style={{ width: size }}
    >
      <div className="relative">
        {/* Grille 3x3 - s'adapte à la forme du crop */}
        <div
          className="grid grid-cols-3 gap-1 relative overflow-hidden rounded-xl"
          style={{ aspectRatio: aspectRatio.toString() }}
          onMouseLeave={() => {
            if (!pinnedSector) setHoverSector(null)
          }}
        >
          {/* Image de fond centrée SANS rotation (comme dans BaguaWheel) */}
          <div className="absolute inset-0 z-0">
            <img
              src={src}
              alt="Plan Bagua"
              className="w-full h-full object-cover"
              style={{
                filter: 'brightness(0.8) contrast(1.1)',
              }}
            />
          </div>

          {/* Overlay avec grille semi-transparente */}
          <div className="absolute inset-0 z-10 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }, (_, index) => {
              const row = Math.floor(index / 3)
              const col = index % 3
              return (
                <div
                  key={index}
                  className="bg-black/20 border border-white/30"
                />
              )
            })}
          </div>

          {/* Secteurs interactifs avec positions rotées */}
          {DIRECTIONS_WITH_CENTER.map((direction) => {
            const position = getGridPositionForDirection(direction, rotation)
            const sectorId = DIRECTION_TO_SECTOR_ID[direction]
            const sector = BAGUA_SECTORS.find(s => s.id === sectorId)

            if (!sector || !position) return null

            const isActive = activeSector === direction
            const isHovered = hoverSector === direction

            return (
              <div
                key={direction}
                className="relative z-20 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105"
                style={{
                  gridRow: position.row + 1,
                  gridColumn: position.col + 1,
                  backgroundColor: isActive ? `${sector.color}40` : 'transparent',
                  border: isActive ? `2px solid ${sector.color}` : '2px solid transparent',
                }}
                onMouseEnter={() => setHoverSector(direction)}
                onMouseLeave={() => {
                  if (!pinnedSector) setHoverSector(null)
                }}
                onClick={() => setPinnedSector(curr => (curr === direction ? null : direction))}
              >
                {/* Label */}
                <div
                  className="text-white font-bold text-sm text-center bg-black/60 px-2 py-1 rounded backdrop-blur-sm"
                  style={{
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    border: isHovered ? `1px solid ${sector.color}` : '1px solid transparent',
                  }}
                >
                  {direction === 'C' ? 'Centre' : direction}
                </div>

                {/* Indicateur de couleur du secteur */}
                <div
                  className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white/50"
                  style={{ backgroundColor: sector.color }}
                />
              </div>
            )
          })}
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