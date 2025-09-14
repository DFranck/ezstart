/* path: /app/analyze/page.tsx */
'use client'

import ClientLayout from '@/components/ClientLayout'
import AnalysisStep from '@/components/steps/AnalysisStep'
import CardinalPointsStep from '@/components/steps/CardinalPointsStep'
import UploadStep from '@/components/steps/UploadStep'
import { Stepper } from '@ezstart/ui/components'

export default function AnalyzePage() {
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
      title: 'Analyse',
      icon: 'lucide:Map',
      description: 'Exploration des secteurs',
      component: <AnalysisStep />,
    },
  ] as const

  const handleStepChange = (idx: number, id: string) => {
    console.log(`Étape changée: ${id} (${idx + 1}/${steps.length})`)
  }

  const handleComplete = (allData: Record<string, unknown>) => {
    console.log('Toutes les données:', allData)
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
