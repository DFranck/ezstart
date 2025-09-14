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
      <div className="min-h-screen bg-background">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-ezstart to-info bg-clip-text text-transparent mb-4">
              🏮 Analyse Feng Shui Bagua
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Analysez votre espace selon les principes traditionnels du Feng Shui
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          allowStepNavigation
        />

        <div className="mt-16 text-center">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-2">🏮 Feng Shui Bagua</h3>
            <p className="text-muted-foreground">
              Application basée sur les principes traditionnels du Feng Shui pour harmoniser votre
              espace de vie
            </p>
          </div>
        </div>
      </div>
    </div>
    </ClientLayout>
  )
}