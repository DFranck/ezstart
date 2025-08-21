/* path: /components/steps/AnalysisStep.tsx */
'use client'

import { loadBaguaConfig } from '@/config/loadBaguaConfig'
import type { CardinalStepData, UploadStepData } from '@/types/bagua'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Icon, StepContent, StepSummary, useStepper } from '@ezstart/ui/components'
import { useEffect, useRef, useState } from 'react'
import BaguaWheel from './BaguaWheel'

export default function AnalysisStep() {
  const [cfg, setCfg] = useState<YearBaguaConfig | null>(null)

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
          <div className="mx-auto w-full max-w-6xl">
            {/* Header minimal */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3 text-blue-700 mb-1 sm:mb-2">
                  <Icon name="lucide:Map" className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-lg sm:text-xl font-bold">Étape 3 : Analyse Bagua</span>
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  Visualisez votre plan avec la roue des secteurs Bagua. Touchez/cliquez un secteur
                  dans la roue si votre composant le supporte.
                </p>
              </div>
            </div>

            {/* Visualisation pizza seule */}
            <section ref={containerRef}>
              <BaguaWheel
                src={uploadData.preview!}
                bearingFromNorth={bearingFromNorth}
                size={wheelSize}
                config={cfg || undefined}
                labelOffset={8}
                cardsMode="all"
                cardsRadiusPct={50}
              />
            </section>

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
