/* path: /app/[locale]/analyze/[id]/page.tsx */
'use client'

import { callApi } from '@/config/api'
import { loadBaguaConfigFromMessages } from '@/config/loadBaguaConfig'
import { usePremium } from '@/hooks/usePremium'
import { Link } from '@/i18n/navigation'
import { THEME_COLORS } from '@/lib/theme-colors'
import { Direction, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { Button, Div, H1, Icon, P, Section, Skeleton, Span } from '@ezstart/ui/components'
import { useScroll } from '@ezstart/ui/hooks'
import { useQuery } from '@tanstack/react-query'
import { useMessages, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import BaguaOrientationsGrid from '@/components/BaguaOrientationsGrid'
import PricingModal from '@/components/PricingModal'
import BaguaGrid from '@/components/steps/BaguaGrid'
import BaguaWheel from '@/components/steps/BaguaWheel'

interface AnalysisData {
  _id: string
  userId: string
  planId: string
  name: string
  bearing: number
  results: Record<string, unknown>
  imageData?: string
  createdAt: string
  updatedAt: string
}

export default function AnalysisViewPage() {
  const params = useParams()
  const id = params.id as string
  const t = useTranslations()
  const messages = useMessages()
  const { isAuthenticated, login } = useAuth()
  const { isPremium } = usePremium()
  const { scrollTo } = useScroll()

  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const [visualizationMode, setVisualizationMode] = useState<'wheel' | 'grid'>('wheel')
  const [expandedSectors, setExpandedSectors] = useState<Set<Direction>>(new Set())
  const [isPricingOpen, setIsPricingOpen] = useState(false)

  // Refs for sector scroll
  const sectorRefs = useRef({} as Record<Direction, React.RefObject<HTMLDivElement | null>>)
  DIRECTIONS_WITH_CENTER.forEach(dir => {
    if (!sectorRefs.current[dir]) {
      sectorRefs.current[dir] = React.createRef<HTMLDivElement>()
    }
  })

  // Load Bagua config from i18n messages
  useEffect(() => {
    try {
      const config = loadBaguaConfigFromMessages(messages)
      setCfg(config)
    } catch (err) {
      logger.error('Failed to load Bagua config', err)
    }
  }, [messages])

  // Fetch analysis (retry on failure — token may need refresh on first load)
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery<AnalysisData>({
    queryKey: ['analysis', id],
    queryFn: async () => {
      const res = await callApi(`/api/analyses/${id}`, { method: 'GET' })
      if (!res.ok) throw new Error(res.error || 'Failed to load analysis')
      return res.data as AnalysisData
    },
    enabled: !!id,
    retry: 5,
    retryDelay: attemptIndex => Math.min(1000 * (attemptIndex + 1), 5000),
  })

  const planImage = analysis?.imageData || null

  const bearing = analysis?.bearing ?? 0

  // Responsive wheel size
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [wheelSize, setWheelSize] = useState<number>(480)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const compute = () => {
      const w = el.clientWidth
      setWheelSize(Math.max(280, Math.min(720, Math.floor(w))))
    }
    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    return () => ro.disconnect()
  }, [analysis])

  const handleSectorClick = (direction: Direction) => {
    setExpandedSectors(new Set([direction]))
    const ref = sectorRefs.current[direction]
    scrollTo(ref, { block: 'center', delay: 100 })
  }

  const handleExpandAll = () => setExpandedSectors(new Set(DIRECTIONS_WITH_CENTER))
  const handleCollapseAll = () => setExpandedSectors(new Set())

  if (isLoadingAnalysis) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </Section>
    )
  }

  if (!analysis) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-7xl text-center">
        <Icon name="lucide:AlertCircle" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <P className="text-lg text-muted-foreground">{t('analysis.notFound')}</P>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">
            <Icon name="lucide:ArrowLeft" className="w-4 h-4 mr-2" />
            {t('analysis.backToDashboard')}
          </Button>
        </Link>
      </Section>
    )
  }

  return (
    <Section className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <Div className="flex items-center justify-between mb-6">
        <Div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-2">
              <Icon name="lucide:ArrowLeft" className="w-4 h-4 mr-2" />
              {t('analysis.backToDashboard')}
            </Button>
          </Link>
          <H1 size="h3" className="font-bold">
            {analysis.name}
          </H1>
          <P className="text-sm text-muted-foreground">
            {t('plans.card.bearing', { bearing: Math.round(bearing) })} —{' '}
            {new Date(analysis.createdAt).toLocaleDateString()}
          </P>
        </Div>
      </Div>

      {/* Toggle visualization */}
      <Div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg max-w-xs mx-auto">
        <Button
          onClick={() => setVisualizationMode('wheel')}
          variant={visualizationMode === 'wheel' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1"
        >
          <Icon name="lucide:CircleDot" className="w-4 h-4" />
          {t('analysis.wheel')}
        </Button>
        <Button
          onClick={() => setVisualizationMode('grid')}
          variant={visualizationMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1"
        >
          <Icon name="lucide:Grid3X3" className="w-4 h-4" />
          {t('analysis.grid')}
        </Button>
      </Div>

      {/* Mobile visualization */}
      <Div className="w-full py-4 flex lg:hidden items-center justify-center">
        <Div className="w-full max-w-[600px]">
          {visualizationMode === 'wheel' ? (
            <BaguaWheel
              src={planImage ?? undefined}
              bearingFromNorth={bearing}
              config={cfg || undefined}
              labelOffset={8}
              size={500}
              cardsMode="hover"
              cardsRadiusPct={50}
              onSectorClick={handleSectorClick}
            />
          ) : (
            <BaguaGrid
              src={planImage ?? undefined}
              bearingFromNorth={bearing}
              size={280}
              config={cfg || undefined}
              cardsMode="hover"
              onSectorClick={handleSectorClick}
            />
          )}
        </Div>
      </Div>

      <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Visualization */}
        <Div className="hidden lg:block lg:col-span-1">
          <Div className="sticky top-36">
            <Div ref={containerRef}>
              {visualizationMode === 'wheel' ? (
                <BaguaWheel
                  src={planImage ?? undefined}
                  bearingFromNorth={bearing}
                  size={Math.min(wheelSize, 400)}
                  config={cfg || undefined}
                  labelOffset={8}
                  cardsMode="hover"
                  cardsRadiusPct={50}
                  onSectorClick={handleSectorClick}
                />
              ) : (
                <BaguaGrid
                  src={planImage ?? undefined}
                  bearingFromNorth={bearing}
                  size={Math.min(wheelSize, 400)}
                  config={cfg || undefined}
                  cardsMode="hover"
                  onSectorClick={handleSectorClick}
                />
              )}
            </Div>
          </Div>
        </Div>

        {/* Right: Orientations */}
        <Div className="lg:col-span-2">
          <BaguaOrientationsGrid
            config={cfg || undefined}
            expandedSectors={expandedSectors}
            onToggleSector={handleSectorClick}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            sectorRefs={sectorRefs.current}
            isPremium={isPremium}
            isAuthenticated={isAuthenticated}
            onOpenPricing={() => setIsPricingOpen(true)}
            onLogin={login}
          />
        </Div>
      </Div>

      {/* PDF preview button — TODO: fix dom-to-image border artifacts before re-enabling
      <Div className="flex justify-center mt-6">
        <Link href={`/analyze/${id}/preview`}>
          <Button
            variant="ghost"
            disabled={!cfg}
            style={{
              background: `linear-gradient(to right, ${THEME_COLORS.cssVars.primary}, ${THEME_COLORS.cssVars.secondary})`,
              color: 'white',
              border: 'none',
            }}
          >
            <Icon name="lucide:FileDown" className="w-4 h-4" />
            <Span>{t('analysis.pdfPreview')}</Span>
          </Button>
        </Link>
      </Div>
      */}

      {/* Pricing Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        year={cfg?.year || new Date().getFullYear()}
      />
    </Section>
  )
}
