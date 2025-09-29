/* path: /app/analyze/page.tsx */
'use client'

import AnalysisStep from '@/components/steps/AnalysisStep'
import CardinalPointsStep from '@/components/steps/CardinalPointsStep-v2'
import UploadStep from '@/components/steps/UploadStep'
import { Stepper, type StepperTheme } from '@ezstart/ui/components'
import { useState } from 'react'

export default function AnalyzePage() {
  const [triggerPreview, setTriggerPreview] = useState(0)

  // Theme FengShui avec dégradé rouge-jaune
  const fengShuiTheme: StepperTheme = {
    primaryColor: '#ef4444', // Rouge pour la barre de progression
    secondaryColor: '#eab308', // Jaune pour les accents
  }

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
    <>
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
        theme={fengShuiTheme}
        renderButtons={context => {
          const uploadData = context.getStepData('upload')
          const isUploadStep = context.currentStep === 0
          const hasFile = uploadData?.file
          const hasCroppedImage = uploadData?.transformations?.crop

          // Pour Step 1: bloquer si pas de fichier OU si image sans crop validé
          const canProceedFromStep1 =
            hasFile &&
            // Si c'est un PDF, pas besoin de crop
            (!uploadData.file?.type?.startsWith('image/') ||
              // Si c'est une image, crop doit être validé
              hasCroppedImage)

          return {
            previous:
              context.currentStep === 0
                ? false
                : {
                    label: 'Précédent',
                    icon: 'lucide:ArrowLeft',
                    variant: 'outline',
                    onClick: context.previousStep,
                    tooltip: "Retourner à l'étape précédente",
                  },
            next: {
              label: context.currentStep === context.steps.length - 1 ? 'Terminer' : 'Suivant',
              icon:
                context.currentStep === context.steps.length - 1
                  ? 'lucide:Check'
                  : 'lucide:ArrowRight',
              variant: 'ezstart',
              disabled: isUploadStep && !canProceedFromStep1,
              onClick: context.nextStep,
              tooltip:
                isUploadStep && !canProceedFromStep1
                  ? hasFile
                    ? "Validez d'abord le crop avec le bouton ✓"
                    : "Uploadez d'abord un plan"
                  : context.currentStep === context.steps.length - 1
                    ? "Terminer l'analyse Feng Shui"
                    : "Passer à l'étape suivante",
            },
            custom:
              isUploadStep && !canProceedFromStep1
                ? [
                    {
                      label: hasFile
                        ? 'Validez le crop avec le bouton ✓'
                        : "Uploadez d'abord un plan",
                      icon: 'lucide:AlertCircle',
                      variant: 'outline',
                      disabled: true,
                      tooltip: hasFile
                        ? 'Utilisez les contrôles de crop puis cliquez sur ✓ pour valider'
                        : 'Glissez-déposez votre plan ou cliquez pour parcourir',
                    },
                  ]
                : undefined,
          }
        }}
      />
    </>
  )
}
