/* path: /app/[locale]/analyze/[id]/preview/page.tsx */
'use client'

import { callApi } from '@/config/api'
import { loadBaguaConfigFromMessages } from '@/config/loadBaguaConfig'
import { usePremium } from '@/hooks/usePremium'
import { DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { logger } from '@ezstart/logger'
import { PdfDocument } from '@ezstart/pdf-sdk'
import { Div, Icon, P, Section, Skeleton } from '@ezstart/ui/components'
import { useQuery } from '@tanstack/react-query'
import { useMessages, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import BaguaGrid from '@/components/steps/BaguaGrid'
import BaguaWheel from '@/components/steps/BaguaWheel'
import BaguaOrientationsGrid from '@/components/BaguaOrientationsGrid'
import { PdfPreviewView } from '@/components/bagua-preview/PdfPreviewView'

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

export default function PdfPreviewPage() {
  const params = useParams()
  const id = params.id as string
  const t = useTranslations()
  const messages = useMessages()
  const { isPremium } = usePremium()

  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [phase, setPhase] = useState<'rendering' | 'capturing' | 'preview'>('rendering')

  // Refs to the VISIBLE rendered components
  const wheelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const orientationsRef = useRef<HTMLDivElement>(null)

  // Load config
  useEffect(() => {
    try {
      const config = loadBaguaConfigFromMessages(messages)
      setCfg(config)
    } catch (err) {
      logger.error('Failed to load Bagua config', err)
    }
  }, [messages])

  // Fetch analysis
  const { data: analysis, isLoading } = useQuery<AnalysisData>({
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

  const bearing = analysis?.bearing ?? 0
  const planImage = analysis?.imageData || undefined

  // Auto-capture after components are rendered
  const doCapture = useCallback(async () => {
    if (!cfg || !analysis || !wheelRef.current || !gridRef.current || !orientationsRef.current)
      return

    setPhase('capturing')

    // Wait for components to fully render
    await new Promise(r => setTimeout(r, 3000))

    // Strip ALL borders/shadows/outlines directly on DOM elements before capture
    // dom-to-image serializes computed styles from original DOM — CSS class overrides are ignored
    // Must set inline styles with !important on every element
    const captureZone = document.getElementById('pdf-capture-zone')
    if (captureZone) {
      captureZone.querySelectorAll('*').forEach(el => {
        const s = (el as HTMLElement).style
        s.setProperty('border', 'none', 'important')
        s.setProperty('box-shadow', 'none', 'important')
        s.setProperty('outline', 'none', 'important')
        s.setProperty('text-shadow', 'none', 'important')
      })
      await new Promise(r => setTimeout(r, 200))
    }

    try {
      const year = cfg.year || new Date().getFullYear()

      const doc = new PdfDocument({ format: 'a4' })

      // Cover page
      doc
        .textPage()
        .space(80)
        .title('Analyse Feng Shui Bagua', { fontSize: 28, color: '#1a1a2e' })
        .space(10)
        .subtitle(`Année ${year}`, { fontSize: 18, color: '#4a4a6a' })
        .space(8)
        .text(`Orientation : ${Math.round(bearing)}°`, {
          fontSize: 14,
          color: '#666666',
          align: 'center',
        })
        .space(5)
        .text(
          new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          { fontSize: 12, color: '#888888', align: 'center' }
        )
        .space(30)
        .separator()
        .space(40)
        .text('Rapport généré par EZStart FengShui', {
          fontSize: 10,
          color: '#aaaaaa',
          align: 'center',
        })

      // Wheel page
      doc
        .capturePage(wheelRef.current, {
          engine: 'dom-to-image',
          scale: 2,
          bgcolor: '#ffffff',
          width: 600,
          height: 600,
        })
        .subtitle('Boussole Bagua')

      // Grid page
      doc
        .capturePage(gridRef.current, {
          engine: 'dom-to-image',
          scale: 2,
          bgcolor: '#ffffff',
          width: 600,
          height: 600,
        })
        .subtitle('Grille Bagua')

      // Orientations pages (auto-paginated)
      // Use html2canvas for orientations — dom-to-image adds gray border artifacts on complex Tailwind components
      doc
        .capturePages(orientationsRef.current, {
          engine: 'dom-to-image',
          scale: 2,
          bgcolor: '#ffffff',
        })
        .title('Orientations Feng Shui')

      const result = await doc.build()

      setPdfUrl(result.blobUrl)
      setPreviews(result.previews)
      setPageCount(result.pageCount)
      setPhase('preview')

      logger.debug(`PDF generated: ${result.pageCount} pages`)
    } catch (error) {
      logger.error('PDF capture error:', error)
      setPhase('preview')
    }
  }, [cfg, analysis, bearing])

  // Trigger capture when data is ready
  useEffect(() => {
    if (cfg && analysis && phase === 'rendering') {
      // Small delay to let React render the components
      const timer = setTimeout(() => doCapture(), 1000)
      return () => clearTimeout(timer)
    }
  }, [cfg, analysis, phase, doCapture])

  if (isLoading || !analysis || !cfg) {
    return (
      <Section className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </Section>
    )
  }

  // Phase: preview — show captured images
  if (phase === 'preview') {
    return (
      <PdfPreviewView
        previews={previews}
        pageCount={pageCount}
        pdfUrl={pdfUrl || ''}
        year={cfg.year}
        onBack={`/analyze/${id}`}
        isGenerating={false}
      />
    )
  }

  // Phase: rendering / capturing — render actual components for capture
  return (
    <Section id="pdf-capture-zone" className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Capture overlay */}
      {phase === 'capturing' && (
        <Div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center">
          <Div className="flex flex-col items-center gap-4">
            <Icon name="lucide:Loader2" className="w-10 h-10 text-primary animate-spin" />
            <P className="text-lg font-semibold">{t('pdfModal.capturingAnalysis')}</P>
          </Div>
        </Div>
      )}

      {/* Render wheel for capture */}
      <Div className="flex justify-center mb-8">
        <Div ref={wheelRef} style={{ width: '600px', height: '600px', backgroundColor: '#ffffff' }}>
          <BaguaWheel
            src={planImage}
            bearingFromNorth={bearing}
            size={600}
            config={cfg}
            radiusPct={46}
            insetRatio={1.0}
            labelOffset={12}
            cardsMode={undefined}
            cardsRadiusPct={35}
            onSectorClick={() => {}}
          />
        </Div>
      </Div>

      {/* Render grid for capture */}
      <Div className="flex justify-center mb-8">
        <Div ref={gridRef} style={{ width: '600px', height: '600px', backgroundColor: '#ffffff' }}>
          <BaguaGrid
            src={planImage}
            bearingFromNorth={bearing}
            size={600}
            config={cfg}
            cardsMode={undefined}
          />
        </Div>
      </Div>

      {/* Render orientations for capture — same layout as analysis page */}
      <Div ref={orientationsRef} style={{ backgroundColor: '#ffffff', padding: '16px' }}>
        <BaguaOrientationsGrid
          config={cfg}
          expandedSectors={new Set(DIRECTIONS_WITH_CENTER)}
          isPremium={isPremium}
          isAuthenticated={true}
          hideControls={true}
        />
      </Div>
    </Section>
  )
}
