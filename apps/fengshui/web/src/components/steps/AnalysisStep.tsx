/* path: /components/steps/AnalysisStep.tsx */
'use client'

import { loadBaguaConfig } from '@/config/loadBaguaConfig'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
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
import { cn } from '@ezstart/ui/lib'
import { useEffect, useRef, useState } from 'react'
import BaguaOrientationsGrid from '../BaguaOrientationsGrid'
import { BaguaPreviewModal } from '../BaguaPreviewModal'
import BaguaWheel from './BaguaWheel'

export default function AnalysisStep() {
  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    loadBaguaConfig(2025, 'fr-FR').then(setCfg).catch(console.error)
  }, [])
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

        // Fonction pour ouvrir la modale preview
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

            <Card variant={'ghost'} className={cn('gap-2 max-w-lg mx-auto', {})}>
              <CardHeader className="flex items-center gap-2">
                <Div className="min-w-8 h-8 rounded-full flex items-center justify-center bg-foreground">
                  <Icon name="lucide:Upload" size={16} className=" bg-foreground text-background" />
                </Div>
                <H2 size={'h5'} className="text-left">
                  Finish
                </H2>
              </CardHeader>
              <CardContent className="">
                <P variant={'description'}>Consultez cette pas ou téléchargez votre Analyse.</P>
                <Button onClick={handleOpenPreview} variant={'ezstart'} disabled={!cfg}>
                  <Icon name="lucide:Eye" className="w-4 h-4" />
                  <span>Aperçu PDF</span>
                </Button>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne gauche : Roue Bagua */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <div ref={containerRef}>
                    <BaguaWheel
                      src={uploadData.preview!}
                      bearingFromNorth={bearingFromNorth}
                      size={Math.min(wheelSize, 400)}
                      config={cfg || undefined}
                      labelOffset={8}
                      cardsMode="hover"
                      cardsRadiusPct={50}
                    />
                  </div>
                </div>
              </div>

              {/* Colonne droite : Orientations détaillées */}
              <div className="lg:col-span-2">
                <BaguaOrientationsGrid config={cfg || undefined} />
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
