/* path: /app/analyze/page.tsx */
'use client'

import ClientLayout from '@/components/ClientLayout'
import AnalysisStep from '@/components/steps/AnalysisStep'
import CardinalPointsStep from '@/components/steps/CardinalPointsStep-v2'
import UploadStep from '@/components/steps/UploadStep'
import { Stepper } from '@ezstart/ui/components'
import { useState } from 'react'

export default function AnalyzePage() {
  const [triggerPreview, setTriggerPreview] = useState(0)

  const steps = [
    {
      id: 'upload',
      title: 'Upload',
      icon: 'lucide:Upload',
      description: 'Import du plan',
      component: <UploadStep />,
    },
    {
      id: 'cardinal-points',
      title: 'Points Cardinaux',
      icon: 'lucide:Compass',
      description: 'Alignement du Bagua',
      component: <CardinalPointsStep />,
    },
    {
      id: 'analysis',
      title: 'Résultats',
      icon: 'lucide:Sparkles',
      description: 'Votre analyse Feng Shui',
      component: <AnalysisStep triggerPreview={triggerPreview} />,
      isFinalStep: true, // Marque cette étape comme finale
    },
  ] as const

  const handleStepChange = (idx: number, id: string) => {
    console.log(`Étape changée: ${id} (${idx + 1}/${steps.length})`)
  }

  const handleComplete = (allData: Record<string, unknown>) => {
    console.log('✅ Analyse terminée! Données collectées:', allData)
    // Déclencher l'ouverture du preview PDF avec un compteur pour forcer le re-trigger
    setTriggerPreview(prev => prev + 1)
  }

  return (
    <ClientLayout>
      <Stepper
        steps={
          steps as unknown as Array<{
            id: string
            title: string
            icon: string
            description: string
            component: React.ReactElement
          }>
        }
        withHeaderOffset
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        allowStepNavigation
      />
    </ClientLayout>
  )
}
