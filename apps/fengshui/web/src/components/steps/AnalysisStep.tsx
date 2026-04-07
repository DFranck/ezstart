/* path: /components/steps/AnalysisStep.tsx */
'use client'

import { loadBaguaConfigFromMessages } from '@/config/loadBaguaConfig'
import { usePremium } from '@/hooks/usePremium'
import { THEME_COLORS } from '@/lib/theme-colors'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import { Direction, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { Button, Div, Icon, Span, StepContent, useStepper } from '@ezstart/ui/components'
import { useScroll } from '@ezstart/ui/hooks'
import { useMessages, useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'
import BaguaOrientationsGrid from '../BaguaOrientationsGrid'
import { PdfPreviewView } from '../bagua-preview/PdfPreviewView'
import { PdfCaptureContainers } from '../bagua-preview/pdf-capture-containers'
import { generatePDF } from '../bagua-preview/pdf-generator'
import PricingModal from '../PricingModal'
import BaguaGrid from './BaguaGrid'
import BaguaWheel from './BaguaWheel'

export default function AnalysisStep({ triggerPreview }: { triggerPreview?: number }) {
  const t = useTranslations()
  const messages = useMessages()
  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const [pdfPreviewMode, setPdfPreviewMode] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfPreviews, setPdfPreviews] = useState<string[]>([])
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Refs for PDF capture containers
  const wheelCaptureRef = useRef<HTMLDivElement>(null)
  const gridCaptureRef = useRef<HTMLDivElement>(null)
  const orientationsCaptureRef = useRef<HTMLDivElement>(null)
  const [visualizationMode, setVisualizationMode] = useState<'wheel' | 'grid'>('wheel')
  const [expandedSectors, setExpandedSectors] = useState<Set<Direction>>(new Set())
  const [isPricingOpen, setIsPricingOpen] = useState(false)
  const { isPremium } = usePremium()
  const { isAuthenticated, login } = useAuth()
  const { scrollTo } = useScroll()

  // Refs pour scroll vers les secteurs
  const sectorRefs = useRef({} as Record<Direction, React.RefObject<HTMLDivElement | null>>)

  // Initialiser les refs pour chaque secteur
  useEffect(() => {
    const refs = {} as Record<Direction, React.RefObject<HTMLDivElement | null>>
    DIRECTIONS_WITH_CENTER.forEach(dir => {
      refs[dir] = React.createRef<HTMLDivElement>()
    })
    sectorRefs.current = refs
  }, [])

  useEffect(() => {
    try {
      const config = loadBaguaConfigFromMessages(messages)
      setCfg(config)
    } catch (error) {
      logger.error('Failed to load Bagua config from messages:', error)
    }
  }, [messages])

  const handleBackFromPreview = () => {
    setPdfPreviewMode(false)
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setPdfPreviews([])
    setPdfPageCount(0)
  }

  // Fonction pour gérer le clic sur un secteur dans la grid
  const handleSectorClick = (direction: Direction) => {
    // Fermer tous les autres et ouvrir seulement celui-ci
    setExpandedSectors(new Set([direction]))

    // Scroller vers le secteur
    const ref = sectorRefs.current[direction]
    scrollTo(ref, { block: 'center', delay: 100 })
  }

  // Fonction pour ouvrir tous les secteurs
  const handleExpandAll = () => {
    setExpandedSectors(new Set(DIRECTIONS_WITH_CENTER))
  }

  // Fonction pour fermer tous les secteurs
  const handleCollapseAll = () => {
    setExpandedSectors(new Set())
  }

  // Trigger PDF generation from parent (currently unused but kept for future use)
  useEffect(() => {
    if (triggerPreview && triggerPreview > 0 && cfg) {
      setPdfPreviewMode(true)
    }
  }, [triggerPreview, cfg])
  return (
    <StepContent stepId="analysis">
      {() => {
        const { getStepData } = useStepper()
        const uploadData = (getStepData('upload') as UploadStepData) ?? {}
        const cardinalData = (getStepData('cardinal-points') as CardinalStepData) ?? {}

        // Pas de plan → on ne rend rien (Step 2 gère déjà l'erreur)
        if (!uploadData.preview) return null

        // On consomme UNIQUEMENT le bearing calculé en step 2
        const rotationAngle = cardinalData.rotationAngle ?? 0
        const bearingFromNorth = cardinalData.bearingFromNorth ?? (rotationAngle + 90) % 360

        const handlePdfGenerate = async () => {
          if (!cfg) return
          setPdfPreviewMode(true)
          setIsGeneratingPdf(true)

          await generatePDF({
            wheelRef: wheelCaptureRef,
            gridRef: gridCaptureRef,
            cardsGridRef: orientationsCaptureRef,
            config: cfg,
            bearingFromNorth,
            onPdfUrl: url => setPdfUrl(url),
            onResult: ({ previews, pageCount }) => {
              setPdfPreviews(previews)
              setPdfPageCount(pageCount)
            },
            onGeneratingChange: setIsGeneratingPdf,
          })
        }

        // Taille responsive de la pizza
        const containerRef = useRef<HTMLDivElement | null>(null)
        const [wheelSize, setWheelSize] = useState<number>(480) // valeur initiale safe

        useEffect(() => {
          if (!containerRef.current) return
          const el = containerRef.current

          const compute = () => {
            // On remplit la largeur disponible, avec un max pour éviter l’énorme
            const w = el.clientWidth
            const size = Math.max(280, Math.min(720, Math.floor(w))) // clamp 280 → 720
            setWheelSize(size)
          }

          compute()

          // ResizeObserver pour suivre le container
          const ro = new ResizeObserver(() => compute())
          ro.observe(el)
          return () => ro.disconnect()
        }, [])

        if (pdfPreviewMode) {
          return (
            <>
              <PdfPreviewView
                previews={pdfPreviews}
                pageCount={pdfPageCount}
                pdfUrl={pdfUrl || ''}
                year={cfg?.year}
                isGenerating={isGeneratingPdf}
                onBack={handleBackFromPreview}
              />
              {/* Keep capture containers rendered for PDF generation */}
              {cfg && (
                <PdfCaptureContainers
                  wheelRef={wheelCaptureRef}
                  gridRef={gridCaptureRef}
                  cardsGridRef={orientationsCaptureRef}
                  planImage={uploadData.preview}
                  bearingFromNorth={bearingFromNorth}
                  config={cfg}
                  transformations={uploadData.transformations}
                  isPremium={isPremium}
                />
              )}
            </>
          )
        }

        return (
          <Div className="mx-auto w-full max-w-7xl">
            {/* Toggle visualisation */}
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
                    src={uploadData.preview!}
                    bearingFromNorth={bearingFromNorth}
                    config={cfg || undefined}
                    labelOffset={8}
                    size={500}
                    cardsMode="hover"
                    cardsRadiusPct={50}
                    onSectorClick={handleSectorClick}
                  />
                ) : (
                  <BaguaGrid
                    src={uploadData.preview!}
                    bearingFromNorth={bearingFromNorth}
                    size={280}
                    config={cfg || undefined}
                    cardsMode="hover"
                    transformations={uploadData.transformations}
                    onSectorClick={handleSectorClick}
                  />
                )}
              </Div>
            </Div>
            <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne gauche : Visualization Bagua (hidden below lg, shown in Card above) */}
              <Div className="hidden lg:block lg:col-span-1">
                <Div className="sticky top-36">
                  <Div ref={containerRef}>
                    {visualizationMode === 'wheel' ? (
                      <BaguaWheel
                        src={uploadData.preview!}
                        bearingFromNorth={bearingFromNorth}
                        size={Math.min(wheelSize, 400)}
                        config={cfg || undefined}
                        labelOffset={8}
                        cardsMode="hover"
                        cardsRadiusPct={50}
                        onSectorClick={handleSectorClick}
                      />
                    ) : (
                      <BaguaGrid
                        src={uploadData.preview!}
                        bearingFromNorth={bearingFromNorth}
                        size={Math.min(wheelSize, 400)}
                        config={cfg || undefined}
                        cardsMode="hover"
                        transformations={uploadData.transformations}
                        onSectorClick={handleSectorClick}
                      />
                    )}
                  </Div>
                </Div>
              </Div>

              {/* Colonne droite : Orientations détaillées */}
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

            {/* PDF download button */}
            <Div className="flex justify-center mt-6">
              <Button
                onClick={handlePdfGenerate}
                variant="ghost"
                disabled={!cfg || isGeneratingPdf}
                style={{
                  background: `linear-gradient(to right, ${THEME_COLORS.cssVars.primary}, ${THEME_COLORS.cssVars.secondary})`,
                  color: 'white',
                  border: 'none',
                }}
              >
                <Icon name="lucide:FileDown" className="w-4 h-4" />
                <Span>{t('analysis.pdfPreview')}</Span>
              </Button>
            </Div>

            {/* Hidden capture containers for PDF generation */}
            {cfg && (
              <PdfCaptureContainers
                wheelRef={wheelCaptureRef}
                gridRef={gridCaptureRef}
                cardsGridRef={orientationsCaptureRef}
                planImage={uploadData.preview}
                bearingFromNorth={bearingFromNorth}
                config={cfg}
                transformations={uploadData.transformations}
                isPremium={isPremium}
              />
            )}

            {/* Pricing Modal */}
            <PricingModal
              isOpen={isPricingOpen}
              onClose={() => setIsPricingOpen(false)}
              year={cfg?.year || new Date().getFullYear()}
            />
          </Div>
        )
      }}
    </StepContent>
  )
}
