'use client'

import { Transformations } from '@/types/bagua'
import { Direction, DIRECTIONS, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { calculateBaguaRotation } from '@/utils/baguaRotation'
import { Div, H2, Icon } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import BaguaGrid from '../steps/BaguaGrid'
import BaguaWheel from '../steps/BaguaWheel'

// Mapping des directions vers les positions de la grille 3x3 (position de base, avant rotation)
const GRID_POSITIONS_BASE: Record<Direction, { row: number; col: number }> = {
  NO: { row: 0, col: 0 },
  N: { row: 0, col: 1 },
  NE: { row: 0, col: 2 },
  O: { row: 1, col: 0 },
  C: { row: 1, col: 1 },
  E: { row: 1, col: 2 },
  SO: { row: 2, col: 0 },
  S: { row: 2, col: 1 },
  SE: { row: 2, col: 2 },
}

function getGridPositionForDirection(direction: Direction, rotation: number) {
  if (direction === 'C') {
    return GRID_POSITIONS_BASE['C']
  }

  if (Math.abs(rotation) < 1) {
    return GRID_POSITIONS_BASE[direction]
  }

  const rotationSteps = Math.round(rotation / 45) % 8

  const baseIndex = DIRECTIONS.indexOf(direction as (typeof DIRECTIONS)[number])
  if (baseIndex === -1) return GRID_POSITIONS_BASE[direction]

  const rotatedIndex = (baseIndex + rotationSteps) % 8
  const rotatedDirection = DIRECTIONS[rotatedIndex]

  return GRID_POSITIONS_BASE[rotatedDirection as Direction]
}

interface PdfCaptureContainersProps {
  wheelRef: React.RefObject<HTMLDivElement | null>
  gridRef: React.RefObject<HTMLDivElement | null>
  cardsRef: React.RefObject<HTMLDivElement | null>
  cardsGridRef: React.RefObject<HTMLDivElement | null>
  planImage?: string
  bearingFromNorth: number
  config: YearBaguaConfig
  visualizationMode: 'wheel' | 'grid'
  transformations?: Transformations
  isPremium: boolean
  isDarkMode: boolean
}

export function PdfCaptureContainers({
  wheelRef,
  gridRef,
  cardsRef,
  cardsGridRef,
  planImage,
  bearingFromNorth,
  config,
  visualizationMode,
  transformations,
  isPremium,
  isDarkMode,
}: PdfCaptureContainersProps) {
  const t = useTranslations()
  const rotation = calculateBaguaRotation(bearingFromNorth, config)

  const pdfCardBg = '#ffffff'
  const pdfTextColor = '#000000'
  const pdfBorderColor = '#e5e5e5'

  return (
    <>
      {/* Wheel MASQUEE pour capture PDF */}
      <Div
        ref={wheelRef}
        style={{
          width: '600px',
          height: '600px',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
        }}
        data-bagua="wheel-container"
      >
        {planImage && config && (
          <BaguaWheel
            src={planImage}
            bearingFromNorth={bearingFromNorth}
            size={600}
            config={config}
            radiusPct={46}
            insetRatio={1.0}
            labelOffset={12}
            cardsMode={undefined}
            cardsRadiusPct={35}
            onSectorClick={() => {}}
          />
        )}
      </Div>

      {/* Grid MASQUEE pour capture PDF */}
      <Div
        ref={gridRef}
        style={{
          width: '600px',
          height: '600px',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
        }}
        data-bagua="grid-container"
      >
        {planImage && config && (
          <Div
            style={{
              width: '600px',
              height: '600px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Div style={{ maxWidth: '600px', maxHeight: '600px' }}>
              <BaguaGrid
                src={planImage}
                bearingFromNorth={bearingFromNorth}
                size={600}
                config={config}
                cardsMode={undefined}
                transformations={transformations}
              />
            </Div>
          </Div>
        )}
      </Div>

      {/* Conteneur des BaguaSectorCard pour capture PDF */}
      <Div
        ref={cardsRef}
        className="relative"
        style={{
          width: '800px',
          height: '800px',
          display: 'none',
        }}
      >
        {planImage &&
          config &&
          (visualizationMode === 'wheel' ? DIRECTIONS : DIRECTIONS_WITH_CENTER).map(
            (dir, index) => {
              let xPct: number, yPct: number

              if (visualizationMode === 'wheel') {
                const angle = index * 45
                const totalRotation = bearingFromNorth + (config?.rotationOffsetDeg ?? 0)
                const adjustedAngle = angle + totalRotation
                const radian = ((adjustedAngle - 90) * Math.PI) / 180

                const cardRadius = 320
                const centerX = 400
                const centerY = 400
                const cardX = centerX + cardRadius * Math.cos(radian)
                const cardY = centerY + cardRadius * Math.sin(radian)

                xPct = (cardX / 800) * 100
                yPct = (cardY / 800) * 100
              } else {
                const gridPositions = {
                  NO: { x: 5, y: 5 },
                  N: { x: 50, y: 2 },
                  NE: { x: 95, y: 5 },
                  O: { x: 2, y: 50 },
                  C: { x: 50, y: 50 },
                  E: { x: 98, y: 50 },
                  SO: { x: 5, y: 95 },
                  S: { x: 50, y: 98 },
                  SE: { x: 95, y: 95 },
                }

                const position = gridPositions[dir as keyof typeof gridPositions]
                xPct = position ? position.x : 50
                yPct = position ? position.y : 50
              }

              const sector = config.orientations?.[dir]
              if (!sector) return null

              const accent = sector.colorHex || '#000000'
              const accents = sector.colorHexes || []
              return (
                <Div
                  key={`pdf-card-${dir}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 shadow-lg overflow-hidden"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: '120px',
                    borderColor: accent,
                    backgroundColor: pdfCardBg,
                  }}
                >
                  <Div
                    className="h-6 flex items-center justify-center text-xs font-bold"
                    style={{
                      background:
                        accents && accents.length > 1
                          ? `linear-gradient(90deg, ${accents.join(', ')})`
                          : accent,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {dir} • {sector.element} •{sector.number}
                  </Div>

                  <Div className="p-2 space-y-1">
                    <Div
                      className="text-xs font-semibold flex items-center justify-center gap-2 text-center"
                      style={{ color: pdfTextColor }}
                    >
                      {sector.title}
                    </Div>

                    {(sector.tips?.[0] || sector.enhancers?.[0]) && (
                      <Div
                        className="text-[9px] leading-tight flex items-center"
                        style={{ color: '#6b7280' }}
                      >
                        {sector.shape && (
                          <Icon
                            name={
                              sector.shape === 'circle'
                                ? 'lucide:Circle'
                                : sector.shape === 'square'
                                  ? 'lucide:Square'
                                  : sector.shape === 'triangle'
                                    ? 'lucide:Triangle'
                                    : sector.shape === 'rectangle'
                                      ? 'lucide:RectangleHorizontal'
                                      : 'lucide:Waves'
                            }
                            className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                            style={{ color: accent }}
                          />
                        )}
                        {((sector.tips?.[0] || sector.enhancers?.[0])?.length || 0) > 35
                          ? (sector.tips?.[0] || sector.enhancers?.[0])?.substring(0, 32) + '...'
                          : sector.tips?.[0] || sector.enhancers?.[0]}
                      </Div>
                    )}
                    {isPremium && sector.star && (
                      <Div className="border-t pt-1" style={{ borderColor: pdfBorderColor }}>
                        <Div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                        >
                          <Icon
                            name="lucide:Star"
                            className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                            style={{
                              color: sector.star.status === 'bonne' ? '#22c55e' : '#ef4444',
                            }}
                          />
                          {sector.star.star} - {sector.star.element}
                        </Div>
                        <Div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                        >
                          {sector.star.remedies?.length > 0 && (
                            <>
                              <Icon name="lucide:Shield" className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                              {sector.star.remedies?.join(', ')}
                            </>
                          )}
                        </Div>
                      </Div>
                    )}
                  </Div>
                </Div>
              )
            }
          )}
      </Div>

      {/* Conteneur des VRAIES cartes React pour page 3 en GRILLE */}
      <Div
        ref={cardsGridRef}
        style={{
          width: '800px',
          minHeight: '1000px',
          padding: '40px',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
        }}
      >
        <H2
          style={{
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: '30px',
          }}
        >
          {t('pdfModal.detailedSectors')}
        </H2>

        <Div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: '20px',
            maxWidth: '720px',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {planImage &&
            config &&
            DIRECTIONS_WITH_CENTER.map(dir => {
              const position = getGridPositionForDirection(dir, rotation)
              const sector = config.orientations?.[dir]
              if (!sector || !position) return null

              const accent = sector.colorHex || '#000000'
              const accents = sector.colorHexes || []
              return (
                <Div
                  key={`grid-card-${dir}`}
                  className="rounded-lg border-2 shadow-lg overflow-hidden"
                  style={{
                    width: '200px',
                    minHeight: '240px',
                    borderColor: accent,
                    backgroundColor: pdfCardBg,
                    margin: '0 auto',
                    gridRow: position.row + 1,
                    gridColumn: position.col + 1,
                  }}
                >
                  <Div
                    className="h-6 flex items-center justify-center text-xs font-bold"
                    style={{
                      background:
                        accents && accents.length > 1
                          ? `linear-gradient(90deg, ${accents.join(', ')})`
                          : accent,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {dir} • {sector.element} • {sector.number}
                  </Div>

                  <Div className="p-2 space-y-1">
                    <Div
                      className="text-xs font-semibold flex items-center justify-center gap-2 text-center"
                      style={{ color: pdfTextColor }}
                    >
                      {sector.title}
                    </Div>

                    {sector.summary && (
                      <Div
                        className="text-[9px] leading-tight flex items-center"
                        style={{ color: '#6b7280' }}
                      >
                        <Icon
                          name={
                            (sector.icon as Parameters<typeof Icon>[0]['name']) || 'lucide:Info'
                          }
                          className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                          style={{ color: accent }}
                        />
                        {sector.summary.length > 35
                          ? sector.summary.substring(0, 32) + '...'
                          : sector.summary}
                      </Div>
                    )}

                    {(sector.nourisher || sector.controller) && (
                      <Div
                        className="text-[9px] leading-tight flex items-center"
                        style={{ color: '#6b7280' }}
                      >
                        <Icon
                          name="lucide:ArrowRightLeft"
                          className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                          style={{ color: accent }}
                        />
                        {sector.nourisher && `${t('bagua.nourishedBy')}: ${sector.nourisher}`}
                        {sector.nourisher && sector.controller && ' • '}
                        {sector.controller && `${t('bagua.controlledBy')}: ${sector.controller}`}
                      </Div>
                    )}

                    {sector.matiere && (
                      <Div
                        className="text-[9px] leading-tight flex items-center"
                        style={{ color: '#6b7280' }}
                      >
                        <Icon
                          name="lucide:Layers"
                          className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                          style={{ color: accent }}
                        />
                        {sector.matiere.length > 32
                          ? sector.matiere.substring(0, 29) + '...'
                          : sector.matiere}
                      </Div>
                    )}

                    {(sector.tips?.[0] || sector.enhancers?.[0]) && (
                      <Div
                        className="text-[9px] leading-tight flex items-center"
                        style={{ color: '#6b7280' }}
                      >
                        {sector.shape && (
                          <Icon
                            name={
                              sector.shape === 'circle'
                                ? 'lucide:Circle'
                                : sector.shape === 'square'
                                  ? 'lucide:Square'
                                  : sector.shape === 'triangle'
                                    ? 'lucide:Triangle'
                                    : sector.shape === 'rectangle'
                                      ? 'lucide:RectangleHorizontal'
                                      : 'lucide:Waves'
                            }
                            className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                            style={{ color: accent }}
                          />
                        )}
                        {((sector.tips?.[0] || sector.enhancers?.[0])?.length || 0) > 35
                          ? (sector.tips?.[0] || sector.enhancers?.[0])?.substring(0, 32) + '...'
                          : sector.tips?.[0] || sector.enhancers?.[0]}
                      </Div>
                    )}

                    {isPremium && sector.star && (
                      <Div className="border-t pt-1" style={{ borderColor: pdfBorderColor }}>
                        <Div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                        >
                          <Icon
                            name="lucide:Star"
                            className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                            style={{
                              color: sector.star.status === 'bonne' ? '#22c55e' : '#ef4444',
                            }}
                          />
                          {sector.star.star} - {sector.star.element}
                        </Div>
                        <Div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                        >
                          {sector.star.remedies?.length > 0 && (
                            <>
                              <Icon name="lucide:Shield" className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                              {sector.star.remedies?.join(', ')}
                            </>
                          )}
                        </Div>
                      </Div>
                    )}
                  </Div>
                </Div>
              )
            })}
        </Div>
      </Div>
    </>
  )
}
