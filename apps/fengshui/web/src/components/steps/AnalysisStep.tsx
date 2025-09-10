/* path: /components/steps/AnalysisStep.tsx */
'use client'

import { loadBaguaConfig } from '@/config/loadBaguaConfig'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Icon, StepContent, StepSummary, useStepper, Button } from '@ezstart/ui/components'
import { useEffect, useRef, useState } from 'react'
import BaguaWheel from './BaguaWheel'
import BaguaOrientationsGrid from '../BaguaOrientationsGrid'
import { useBaguaPDF } from '@/hooks/useBaguaPDF'

export default function AnalysisStep() {
  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)
  const { generatePDF, isGenerating } = useBaguaPDF()

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

        // Fonction pour générer le PDF
        const handleGeneratePDF = async () => {
          if (!cfg) return
          
          await generatePDF({
            config: cfg,
            planImage: uploadData.preview,
            bearingFromNorth,
            filename: `analyse-bagua-${new Date().toISOString().split('T')[0]}.pdf`
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

        return (
          <div className="mx-auto w-full max-w-7xl">
            {/* Header avec bouton PDF */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-3 text-blue-700 mb-1 sm:mb-2">
                      <Icon name="lucide:Map" className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="text-lg sm:text-xl font-bold">Analyse Bagua de votre plan</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600">
                      Explorez les secteurs Bagua et leurs recommandations pour harmoniser votre espace
                    </p>
                  </div>
                  <Button
                    className="ml-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleGeneratePDF}
                    disabled={!cfg || isGenerating}
                  >
                    {isGenerating ? (
                      <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon name="lucide:Download" className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isGenerating ? 'Génération...' : 'PDF'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

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

            {/* Résumé (optionnel) */}
            <div className="mt-8">
              <StepSummary />
            </div>
          </div>
        )
      }}
    </StepContent>
  )
}
