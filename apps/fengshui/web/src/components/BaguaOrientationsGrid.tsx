/* path: /components/BaguaOrientationsGrid.tsx */
'use client'

import { DIRECTIONS_WITH_CENTER, Direction } from '@/types/directions'
import type { YearBaguaConfig, CombinedOrientation } from '@/types/yearBaguaConfig'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Div,
  H2,
  H3,
  H4,
  H5,
  Icon,
  KnownIconName,
  LI,
  P,
  Span,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { RefObject, forwardRef, useState } from 'react'
import PremiumGate from './PremiumGate'

type Props = {
  config?: YearBaguaConfig
  expandedSectors?: Set<Direction>
  onToggleSector?: (dir: Direction) => void
  onExpandAll?: () => void
  onCollapseAll?: () => void
  sectorRefs?: Record<Direction, RefObject<HTMLDivElement | null>>
  isPremium?: boolean
  isAuthenticated?: boolean
  onOpenPricing?: () => void
  onLogin?: () => void
  hideControls?: boolean
}

export default function BaguaOrientationsGrid({
  config,
  expandedSectors: externalExpandedSectors,
  onToggleSector,
  onExpandAll,
  onCollapseAll,
  sectorRefs,
  isPremium = false,
  isAuthenticated = false,
  onOpenPricing,
  onLogin,
  hideControls = false,
}: Props) {
  const t = useTranslations()
  const [internalExpandedSectors, setInternalExpandedSectors] = useState<Set<Direction>>(new Set())

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
      onExpandAll()
    } else {
      setInternalExpandedSectors(new Set(DIRECTIONS_WITH_CENTER))
    }
  }

  const collapseAll = () => {
    if (externalExpandedSectors && onCollapseAll) {
      onCollapseAll()
    } else {
      setInternalExpandedSectors(new Set())
    }
  }

  if (!config) {
    return (
      <Div className="text-center text-muted-foreground py-12">
        <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto mb-4 animate-spin" />
        <P>{t('bagua.loading')}</P>
      </Div>
    )
  }

  return (
    <Div className="space-y-4">
      {!hideControls && (
        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <H2 className="text-lg sm:text-xl font-bold text-foreground">
            {t('bagua.orientations')}
          </H2>
          <Div className="flex gap-2 text-sm">
            <Button
              onClick={expandAll}
              variant="link"
              className="text-sm text-primary hover:text-primary/80 transition-colors p-0 h-auto"
            >
              {t('bagua.expandAll')}
            </Button>
            <Span className="text-muted-foreground">•</Span>
            <Button
              onClick={collapseAll}
              variant="link"
              className="text-sm text-primary hover:text-primary/80 transition-colors p-0 h-auto"
            >
              {t('bagua.collapseAll')}
            </Button>
          </Div>
        </Div>
      )}

      <Div className="space-y-2 sm:space-y-3">
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
              year={config.year || new Date().getFullYear()}
              isPremium={isPremium}
              isAuthenticated={isAuthenticated}
              onOpenPricing={onOpenPricing}
              onLogin={onLogin}
              ref={sectorRefs?.[dir]}
            />
          )
        })}
      </Div>
    </Div>
  )
}

type SectorCardProps = {
  direction: Direction
  sector: CombinedOrientation
  accent: string
  isExpanded: boolean
  onToggle: () => void
  year: number
  isPremium: boolean
  isAuthenticated: boolean
  onOpenPricing?: () => void
  onLogin?: () => void
}

const SectorCard = forwardRef<HTMLDivElement, SectorCardProps>(function SectorCard(
  {
    direction,
    sector,
    accent,
    isExpanded,
    onToggle,
    year,
    isPremium,
    isAuthenticated,
    onOpenPricing,
    onLogin,
  },
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

  const hasGradient = sector.colorHexes && sector.colorHexes.length > 1

  return (
    <Div className="relative bg-card backdrop-blur rounded-xl sm:rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden">
      <Div
        className="absolute top-0 left-0 right-0 h-[5px]"
        style={{
          background: hasGradient
            ? `linear-gradient(90deg, ${sector.colorHexes.join(', ')})`
            : accent,
        }}
      />
      <Div className="pt-[5px]">
        <Div ref={ref}>
          <Button
            onClick={onToggle}
            variant="ghost"
            className="w-full p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors rounded-t-xl sm:rounded-t-2xl !h-auto whitespace-normal justify-start items-start"
          >
            <Div className="flex items-start sm:items-center justify-between gap-2">
              <Div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Div className="min-w-0 flex-1">
                  <Div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <H3 className="text-sm sm:text-base font-bold text-foreground truncate">
                      {sector.title}
                    </H3>
                    <Div className="flex items-center gap-1 sm:gap-2 flex-wrap">
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
                      <Span
                        className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-semibold rounded-full flex-shrink-0"
                        style={{
                          color: accent,
                          backgroundColor: `${accent}15`,
                          border: `1px solid ${accent}30`,
                        }}
                      >
                        {sector.element}
                      </Span>
                      <Span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                        {direction}
                      </Span>
                    </Div>
                  </Div>
                  {sector.summary && (
                    <P className="text-xs sm:text-sm text-muted-foreground mt-1 whitespace-normal line-clamp-3">
                      {sector.summary}
                    </P>
                  )}
                  {!isExpanded && (has.enhancers || sector.matiere) && (
                    <Div className="mt-1.5 space-y-0.5">
                      {has.enhancers && (
                        <P className="text-xs text-muted-foreground/70 line-clamp-1 whitespace-normal flex items-center gap-1">
                          <Icon name="lucide:Sparkles" className="w-3 h-3 flex-shrink-0" />
                          {sector.enhancers.join(' · ')}
                        </P>
                      )}
                      {sector.matiere && (
                        <P className="text-xs text-muted-foreground/70 line-clamp-1 whitespace-normal flex items-center gap-1">
                          <Icon name="lucide:Package" className="w-3 h-3 flex-shrink-0" />
                          {sector.matiere}
                        </P>
                      )}
                    </Div>
                  )}
                </Div>
              </Div>

              <Icon
                name={isExpanded ? 'lucide:ChevronUp' : 'lucide:ChevronDown'}
                className="w-5 h-5 text-muted-foreground transition-transform flex-shrink-0"
              />
            </Div>
          </Button>
        </Div>

        {isExpanded && (
          <Card variant={'ghost'}>
            <CardHeader size="xs" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Div>
                <H5 className="font-semibold  mb-2 flex items-center gap-1">
                  <Icon name="lucide:Sparkles" className="w-4 h-4" />
                  {t('bagua.naturalActivators')}
                </H5>
                <UL className="space-y-1">
                  {sector.enhancers.map((enhancer: string, idx: number) => (
                    <LI key={idx} className="text-sm flex items-start gap-2">
                      <Span className="w-1.5 h-1.5 rounded-full bg-muted mt-2 flex-shrink-0" />
                      {enhancer}
                    </LI>
                  ))}
                </UL>
              </Div>

              <Div>
                <H5 className="font-semibold  mb-2 flex items-center gap-1">
                  <Icon name="lucide:Package" className="w-4 h-4" />
                  {t('bagua.favorableMaterials')}
                </H5>
                <P className="text-sm ">{sector.matiere}</P>
              </Div>
            </CardHeader>
            <CardContent size="xs">
              <H5 className="font-semibold mb-2">{t('bagua.fiveElementsCycles')}</H5>
              <Div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <Div className="text-center p-2 bg-success/10 rounded border border-success/30">
                  <P className="font-medium text-success">{t('bagua.nourishedBy')}</P>
                  <P className="text-success/80">{sector.nourisher}</P>
                </Div>
                <Div className="text-center p-2 bg-destructive/10 rounded border border-destructive/30">
                  <P className="font-medium text-destructive">{t('bagua.controlledBy')}</P>
                  <P className="text-destructive/80">{sector.controller}</P>
                </Div>
                <Div className="text-center p-2 bg-warning/10 rounded border border-warning/30">
                  <P className="font-medium text-warning">{t('bagua.weakenedBy')}</P>
                  <P className="text-warning/80">{sector.weakenedBy}</P>
                </Div>
              </Div>
            </CardContent>
            {sector.star && (
              <CardFooter size="xs">
                {isPremium ? (
                  <Div
                    className={`p-4 rounded-lg border-2 w-full ${sector.star.status === 'bonne' ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'}`}
                  >
                    <Div className="flex items-center gap-2 mb-3">
                      <Icon
                        name={
                          sector.star.status === 'bonne' ? 'lucide:Star' : 'lucide:AlertTriangle'
                        }
                        className={`w-5 h-5 ${sector.star.status === 'bonne' ? 'text-success' : 'text-destructive'}`}
                      />
                      <H4
                        className={`font-bold ${sector.star.status === 'bonne' ? 'text-success' : 'text-destructive'}`}
                      >
                        {t('bagua.flyingStar', { year })} ({t(`bagua.${sector.star.status}`)})
                      </H4>
                    </Div>

                    <Div className="mb-3">
                      <H5 className="font-semibold text-foreground mb-1">⭐ {sector.star.star}</H5>
                      {sector.star.element && (
                        <P className="text-sm text-muted-foreground">
                          Élément : {sector.star.element}
                        </P>
                      )}
                    </Div>

                    {sector.star.remedies.length > 0 && (
                      <Div>
                        <H5 className="font-semibold text-foreground mb-2 flex items-center gap-1">
                          <Icon name="lucide:Shield" className="w-4 h-4" />
                          {t('bagua.specificRemedies', { year })}
                        </H5>
                        <UL className="space-y-1">
                          {sector.star.remedies.map((remedy: string, idx: number) => (
                            <LI
                              key={idx}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <Span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                              {remedy}
                            </LI>
                          ))}
                        </UL>
                      </Div>
                    )}
                  </Div>
                ) : (
                  <PremiumGate
                    year={year}
                    isAuthenticated={isAuthenticated}
                    onUnlock={() => onOpenPricing?.()}
                    onLogin={() => onLogin?.()}
                  />
                )}
              </CardFooter>
            )}
          </Card>
        )}
      </Div>
    </Div>
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
    <Div>
      <H4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
        <Icon name={icon as KnownIconName} className="w-4 h-4" style={{ color }} />
        {title}
      </H4>
      <UL className="space-y-1">
        {items.map((item: string, index: number) => (
          <LI key={index} className="text-sm text-muted-foreground flex items-start gap-2">
            <Span
              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {item}
          </LI>
        ))}
      </UL>
    </Div>
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
