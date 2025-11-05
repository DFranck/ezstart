/* path: /components/BaguaOrientationsGrid.tsx */
'use client'

import { DIRECTIONS_WITH_CENTER, Direction } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Button, Card, CardContent, CardFooter, CardHeader, Icon, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { RefObject, forwardRef, useState } from 'react'

type Props = {
  config?: YearBaguaConfig
  expandedSectors?: Set<Direction>
  onToggleSector?: (dir: Direction) => void
  onExpandAll?: () => void
  onCollapseAll?: () => void
  sectorRefs?: Record<Direction, RefObject<HTMLDivElement | null>>
}

export default function BaguaOrientationsGrid({
  config,
  expandedSectors: externalExpandedSectors,
  onToggleSector,
  onExpandAll,
  onCollapseAll,
  sectorRefs,
}: Props) {
  const t = useTranslations()
  const [internalExpandedSectors, setInternalExpandedSectors] = useState<Set<Direction>>(new Set())

  // Utiliser les contrôles externes si fournis, sinon utiliser l'état interne
  const expandedSectors = externalExpandedSectors ?? internalExpandedSectors
  const toggleSector =
    onToggleSector ??
    ((dir: Direction) => {
      setInternalExpandedSectors(prev => {
        const next = new Set(prev)
        if (next.has(dir)) {
          next.delete(dir)
        } else {
          next.add(dir)
        }
        return next
      })
    })

  const expandAll = () => {
    if (externalExpandedSectors && onExpandAll) {
      // Mode externe : déléguer au parent
      onExpandAll()
    } else {
      // Mode interne : gérer localement
      setInternalExpandedSectors(new Set(DIRECTIONS_WITH_CENTER))
    }
  }

  const collapseAll = () => {
    if (externalExpandedSectors && onCollapseAll) {
      // Mode externe : déléguer au parent
      onCollapseAll()
    } else {
      // Mode interne : gérer localement
      setInternalExpandedSectors(new Set())
    }
  }

  if (!config) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto mb-4 animate-spin" />
        <p>{t('bagua.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('bagua.orientations')}</h2>
        <div className="flex gap-2 text-sm">
          <Button
            onClick={expandAll}
            variant="link"
            className="text-sm text-primary hover:text-primary/80 transition-colors p-0 h-auto"
          >
            {t('bagua.expandAll')}
          </Button>
          <span className="text-muted-foreground">•</span>
          <Button
            onClick={collapseAll}
            variant="link"
            className="text-sm text-primary hover:text-primary/80 transition-colors p-0 h-auto"
          >
            {t('bagua.collapseAll')}
          </Button>
        </div>
      </div>

      {/* Grille des secteurs */}
      <div className="space-y-2 sm:space-y-3">
        {DIRECTIONS_WITH_CENTER.map(dir => {
          const sector = config.orientations[dir]
          if (!sector) return null

          const isExpanded = expandedSectors.has(dir)
          const accent = getElementColor(sector.element)

          return (
            <SectorCard
              key={dir}
              direction={dir}
              sector={sector}
              accent={accent}
              isExpanded={isExpanded}
              onToggle={() => toggleSector(dir)}
              ref={sectorRefs?.[dir]}
            />
          )
        })}
      </div>
    </div>
  )
}

type SectorCardProps = {
  direction: Direction
  sector: any
  accent: string
  isExpanded: boolean
  onToggle: () => void
}

const SectorCard = forwardRef<HTMLDivElement, SectorCardProps>(function SectorCard(
  { direction, sector, accent, isExpanded, onToggle },
  ref
) {
  const t = useTranslations()
  const has = {
    keywords: !!sector.keywords?.length,
    tips: !!sector.tips?.length,
    enhancers: !!sector.enhancers?.length,
    remedies: !!sector.remedies?.length,
    avoid: !!sector.avoid?.length,
    symbols: !!sector.symbols?.length,
    notes: !!sector.notes,
  }

  // Utiliser le gradient si colorHexes existe, sinon couleur simple
  const hasGradient = sector.colorHexes && sector.colorHexes.length > 1

  return (
    <div
      className="relative bg-card backdrop-blur rounded-xl sm:rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {/* Barre de gradient en haut */}
      <div
        className="absolute top-0 left-0 right-0 h-[5px]"
        style={{
          background: hasGradient
            ? `linear-gradient(90deg, ${sector.colorHexes.join(', ')})`
            : accent,
        }}
      />
      <div className="pt-[5px]">
        {/* Header cliquable */}
        <div ref={ref}>
          <Button
            onClick={onToggle}
            variant="ghost"
            className="w-full p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors rounded-t-xl sm:rounded-t-2xl h-auto justify-start"
          >
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* {sector.icon && (
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accent}15` }}
              >
                <Icon
                  name={sector.icon as KnownIconName}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  style={{ color: accent }}
                />
              </div>
            )} */}

              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                    {sector.title}
                  </h3>
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
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
                    <span
                      className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-semibold rounded-full flex-shrink-0"
                      style={{
                        color: accent,
                        backgroundColor: `${accent}15`,
                        border: `1px solid ${accent}30`,
                      }}
                    >
                      {sector.element}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                      {direction}
                    </span>
                  </div>
                </div>
                {sector.summary && (
                  <P className="text-xs sm:text-sm text-muted-foreground mt-1 whitespace-normal line-clamp-2">
                    {sector.summary}
                  </P>
                )}
              </div>
            </div>

            <Icon
              name={isExpanded ? 'lucide:ChevronUp' : 'lucide:ChevronDown'}
              className="w-5 h-5 text-muted-foreground transition-transform flex-shrink-0"
            />
          </div>
          </Button>
        </div>

        {/* Contenu développable */}
        {isExpanded && (
          <Card variant={'ghost'}>
            {/* Bagua de Base - Informations permanentes */}
            <CardHeader size="xs" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Activateurs de base */}
              <div>
                <h5 className="font-semibold  mb-2 flex items-center gap-1">
                  <Icon name="lucide:Sparkles" className="w-4 h-4" />
                  {t('bagua.naturalActivators')}
                </h5>
                <ul className="space-y-1">
                  {sector.enhancers.map((enhancer: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted mt-2 flex-shrink-0" />
                      {enhancer}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Matières favorables */}
              <div>
                <h5 className="font-semibold  mb-2 flex items-center gap-1">
                  <Icon name="lucide:Package" className="w-4 h-4" />
                  {t('bagua.favorableMaterials')}
                </h5>
                <p className="text-sm ">{sector.matiere}</p>
              </div>
            </CardHeader>
            {/* Cycles des éléments */}
            <CardContent size="xs">
              <h5 className="font-semibold mb-2">{t('bagua.fiveElementsCycles')}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-green-100 rounded border border-green-300">
                  <p className="font-medium text-green-800">{t('bagua.nourishedBy')}</p>
                  <p className="text-green-700">{sector.nourisher}</p>
                </div>
                <div className="text-center p-2 bg-red-100 rounded border border-red-300">
                  <p className="font-medium text-red-800">{t('bagua.controlledBy')}</p>
                  <p className="text-red-700">{sector.controller}</p>
                </div>
                <div className="text-center p-2 bg-orange-100 rounded border border-orange-300">
                  <p className="font-medium text-orange-800">{t('bagua.weakenedBy')}</p>
                  <p className="text-orange-700">{sector.weakenedBy}</p>
                </div>
              </div>
            </CardContent>
            {/* Étoiles Volantes - Informations temporaires */}
            {sector.star && (
              <CardFooter size="xs">
                <div
                  className="p-4 rounded-lg border-2 w-full"
                  style={{
                    borderColor: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626',
                    backgroundColor: sector.star.status === 'bonne' ? '#dcfce7' : '#fef2f2',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon
                      name={sector.star.status === 'bonne' ? 'lucide:Star' : 'lucide:AlertTriangle'}
                      className="w-5 h-5"
                      style={{ color: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626' }}
                    />
                    <h4
                      className="font-bold"
                      style={{ color: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626' }}
                    >
                      {t('bagua.flyingStar2025')} ({t(`bagua.${sector.star.status}`)})
                    </h4>
                  </div>

                  <div className="mb-3">
                    <h5 className="font-semibold text-gray-800 mb-1">⭐ {sector.star.star}</h5>
                    {sector.star.element && (
                      <p className="text-sm text-gray-600">Élément : {sector.star.element}</p>
                    )}
                  </div>

                  {sector.star.remedies.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                        <Icon name="lucide:Shield" className="w-4 h-4" />
                        {t('bagua.specificRemedies2025')}
                      </h5>
                      <ul className="space-y-1">
                        {sector.star.remedies.map((remedy: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
                            {remedy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  )
})

type InfoSectionProps = {
  title: string
  items: string[]
  icon: string
  accent: string
  danger?: boolean
}

function InfoSection({ title, items, icon, accent, danger }: InfoSectionProps) {
  const color = danger ? '#dc2626' : accent

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <Icon name={icon as any} className="w-4 h-4" style={{ color }} />
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item: string, index: number) => (
          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function getElementColor(element: string): string {
  switch (element) {
    case 'Eau':
      return '#0D47A1'
    case 'Bois':
      return '#2E7D32'
    case 'Feu':
      return '#D32F2F'
    case 'Terre':
      return '#BCA16A'
    case 'Métal':
      return '#B0BEC5'
    default:
      return '#94a3b8'
  }
}
