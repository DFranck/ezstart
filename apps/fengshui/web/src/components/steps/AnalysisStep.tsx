/* path: /components/steps/AnalysisStep.tsx */
'use client'

import { loadBaguaConfig } from '@/config/loadBaguaConfig'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import { Direction, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  Icon,
  P,
  StepContent,
  useStepper,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import React, { useEffect, useRef, useState } from 'react'
import BaguaOrientationsGrid from '../BaguaOrientationsGrid'
import { BaguaPreviewModal } from '../BaguaPreviewModal'
import BaguaGrid from './BaguaGrid'
import BaguaWheel from './BaguaWheel'

export default function AnalysisStep({ triggerPreview }: { triggerPreview?: number }) {
  const { isMobile } = useDevice()
  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [visualizationMode, setVisualizationMode] = useState<'wheel' | 'grid'>('wheel')
  const [expandedSectors, setExpandedSectors] = useState<Set<Direction>>(new Set())

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
    loadBaguaConfig(2025, 'fr-FR').then(setCfg).catch(console.error)
  }, [])

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
      console.error('Erreur génération PDF:', error)
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
          <div className="mx-auto w-full max-w-7xl">
            {/* Header avec bouton PDF */}

            <Card variant={'ghost'} className={cn('gap-2 max-w-lg mx-auto mb-6', {})}>
              <CardHeader className="flex items-center gap-2">
                <Div className="min-w-8 h-8 rounded-full flex items-center justify-center bg-foreground">
                  <Icon
                    name="lucide:Sparkles"
                    size={16}
                    className=" bg-foreground text-background"
                  />
                </Div>
                <H2 size={'h5'} className="text-left">
                  Votre Analyse Feng Shui
                </H2>
              </CardHeader>
              <CardContent className="">
                <P variant={'description'}>
                  Découvrez l'harmonisation de votre espace selon les principes du Bagua. Consultez
                  les recommandations pour chaque secteur ou générez un PDF complet.
                </P>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleOpenPreview}
                    variant={'ezstart'}
                    disabled={!cfg || isGeneratingPDF}
                  >
                    <Icon name="lucide:FileDown" className="w-4 h-4" />
                    <span>Aperçu PDF</span>
                  </Button>
                </div>

                {/* Toggle visualisation */}
                <div className="flex gap-1 mt-3 p-1 bg-muted rounded-lg">
                  <Button
                    onClick={() => setVisualizationMode('wheel')}
                    variant={visualizationMode === 'wheel' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1"
                  >
                    <Icon name="lucide:CircleDot" className="w-4 h-4" />
                    Roue
                  </Button>
                  <Button
                    onClick={() => setVisualizationMode('grid')}
                    variant={visualizationMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1"
                  >
                    <Icon name="lucide:Grid3X3" className="w-4 h-4" />
                    Grille
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne gauche : Visualization Bagua */}
              <div className="lg:col-span-1">
                <div className="sticky top-36">
                  <div ref={containerRef}>
                    {visualizationMode === 'wheel' ? (
                      <BaguaWheel
                        src={uploadData.preview!}
                        bearingFromNorth={bearingFromNorth}
                        size={Math.min(wheelSize, 400)}
                        config={cfg || undefined}
                        labelOffset={8}
                        cardsMode="hover"
                        cardsRadiusPct={50}
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
                  </div>
                </div>
              </div>

              {/* Colonne droite : Orientations détaillées */}
              <div className="lg:col-span-2">
                <BaguaOrientationsGrid
                  config={cfg || undefined}
                  expandedSectors={expandedSectors}
                  onToggleSector={handleSectorClick}
                  sectorRefs={sectorRefs.current}
                />
              </div>
            </div>

            {/* Preview Modal */}
            {cfg && (
              <BaguaPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                config={cfg}
                planImage={uploadData.preview}
                bearingFromNorth={bearingFromNorth}
              />
            )}
          </div>
        )
      }}
    </StepContent>
  )
}
