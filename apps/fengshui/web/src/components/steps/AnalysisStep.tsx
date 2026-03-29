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
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  Icon,
  P,
  Span,
  StepContent,
  useStepper,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { useLocale, useMessages, useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'
import BaguaOrientationsGrid from '../BaguaOrientationsGrid'
import { BaguaPreviewModal } from '../BaguaPreviewModal'
import PricingModal from '../PricingModal'
import BaguaGrid from './BaguaGrid'
import BaguaWheel from './BaguaWheel'

export default function AnalysisStep({ triggerPreview }: { triggerPreview?: number }) {
  const { isMobile } = useDevice()
  const t = useTranslations()
  const locale = useLocale()
  const messages = useMessages()
  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [visualizationMode, setVisualizationMode] = useState<'wheel' | 'grid'>('wheel')
  const [expandedSectors, setExpandedSectors] = useState<Set<Direction>>(new Set())
  const [isPricingOpen, setIsPricingOpen] = useState(false)
  const { isPremium } = usePremium()
  const { isAuthenticated, login } = useAuth()

  // Refs pour scroll vers les secteurs
  const sectorRefs = useRef<Record<Direction, React.RefObject<HTMLDivElement | null>>>({} as any)

  // Initialiser les refs pour chaque secteur
  useEffect(() => {
    const refs: Record<Direction, React.RefObject<HTMLDivElement | null>> = {} as any
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

  // Fonction pour télécharger directement le PDF (mobile)
  const handleDirectPDFDownload = async (uploadData: UploadStepData, bearingFromNorth: number) => {
    if (!cfg) return

    try {
      setIsGeneratingPDF(true)

      // Créer temporairement la roue Bagua pour la capture
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      tempDiv.style.width = '400px'
      tempDiv.style.height = '400px'
      document.body.appendChild(tempDiv)

      // Import des libs
      const { default: domtoimage } = await import('dom-to-image')
      const { default: jsPDF } = await import('jspdf')

      // Render la roue dans le div temporaire (il faudrait créer BaguaWheel ici)
      // Pour l'instant, on simule juste le téléchargement
      const pdf = new jsPDF()
      pdf.text('Analyse Feng Shui', 20, 20)
      pdf.text(`Bearing: ${bearingFromNorth}°`, 20, 40)
      pdf.save('analyse-fengshui.pdf')

      document.body.removeChild(tempDiv)
    } catch (error) {
      logger.error('Erreur génération PDF:', error)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Fonction pour gérer le clic sur un secteur dans la grid
  const handleSectorClick = (direction: Direction) => {
    // Fermer tous les autres et ouvrir seulement celui-ci
    setExpandedSectors(new Set([direction]))

    // Toujours scroller vers le secteur
    setTimeout(() => {
      const ref = sectorRefs.current[direction]
      if (ref?.current) {
        // Scroll avec offset pour voir le bouton et le début du contenu
        const rect = ref.current.getBoundingClientRect()
        const offset = 150 // Espace au-dessus du bouton
        window.scrollTo({
          top: window.scrollY + rect.top - offset,
          behavior: 'smooth',
        })
      }
    }, 100) // Petit délai pour l'animation d'ouverture
  }

  // Fonction pour ouvrir tous les secteurs
  const handleExpandAll = () => {
    setExpandedSectors(new Set(DIRECTIONS_WITH_CENTER))
  }

  // Fonction pour fermer tous les secteurs
  const handleCollapseAll = () => {
    setExpandedSectors(new Set())
  }

  // Ouvrir le preview toujours (besoin de la roue pour PDF)
  useEffect(() => {
    if (triggerPreview && triggerPreview > 0 && cfg) {
      setIsPreviewOpen(true)
    }
  }, [triggerPreview, cfg])
  return (
    <StepContent stepId="analysis">
      {() => {
        const { getStepData } = useStepper()
        const uploadData = (getStepData('upload') as UploadStepData) ?? {}
        const cardinalData = (getStepData('cardinal-points') as CardinalStepData) ?? {}

        // Pas de plan → on ne rend rien (Step 2 gère déjà l'erreur)
        if (!uploadData.file || !uploadData.preview) return null

        // On consomme UNIQUEMENT le bearing calculé en step 2
        const rotationAngle = cardinalData.rotationAngle ?? 0
        const bearingFromNorth = cardinalData.bearingFromNorth ?? (rotationAngle + 90) % 360

        // Fonction pour ouvrir preview (toujours modal, responsive)
        const handleOpenPreview = () => {
          setIsPreviewOpen(true)
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

        return (
          <Div className="mx-auto w-full max-w-7xl">
            {/* Header avec bouton PDF */}

            <Card variant={'ghost'} className={cn('gap-2 mx-auto mb-6', {})}>
              <CardHeader className="flex items-center justify-center gap-2">
                <Icon name="lucide:Sparkles" size={16} />
                <H2 size={'h5'} className="w-fit">
                  {t('analysis.title')}
                </H2>
              </CardHeader>
              <CardContent className="">
                <P variant={'description'}>{t('analysis.description')}</P>
                <Div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleOpenPreview}
                    variant="ghost"
                    disabled={!cfg || isGeneratingPDF}
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

                {/* Toggle visualisation */}
                <Div className="flex gap-1 mt-3 p-1 bg-muted rounded-lg">
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
                <Div className="w-full py-4 flex lg:hidden items-center justify-center">
                  <Div className="w-full  max-w-[600px]">
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
              </CardContent>
            </Card>
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

            {/* Preview Modal */}
            {cfg && (
              <BaguaPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                config={cfg}
                planImage={uploadData.preview}
                bearingFromNorth={bearingFromNorth}
                visualizationMode={visualizationMode}
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
