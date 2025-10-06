/* path: /app/[locale]/analyze/page.tsx */
'use client'

import AnalysisStep from '@/components/steps/AnalysisStep'
import CardinalPointsStep from '@/components/steps/CardinalPointsStep-v2'
import UploadStep from '@/components/steps/UploadStep'
import { THEME_COLORS } from '@/lib/theme-colors'
import { Stepper, type StepperTheme } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function AnalyzePage() {
  const [triggerPreview, setTriggerPreview] = useState(0)
  const t = useTranslations()

  // Theme FengShui dynamique (centralisé dans theme-colors.ts)
  const fengShuiTheme: StepperTheme = {
    primaryColor: THEME_COLORS.hex.primary,
    secondaryColor: THEME_COLORS.hex.secondary,
  }

  const steps = [
    {
      id: 'upload',
      title: t('steps.upload.title'),
      icon: 'lucide:Upload',
      description: t('steps.upload.description'),
      component: <UploadStep />,
    },
    {
      id: 'cardinal-points',
      title: t('steps.orientation.title'),
      icon: 'lucide:Compass',
      description: t('steps.orientation.description'),
      component: <CardinalPointsStep />,
    },
    {
      id: 'analysis',
      title: t('steps.analysis.title'),
      icon: 'lucide:Sparkles',
      description: t('steps.analysis.description'),
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
        bottomOffset="bottom-10 sm:bottom-0"
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
                    label: t('common.previous'),
                    icon: 'lucide:ArrowLeft',
                    variant: 'outline',
                    onClick: context.previousStep,
                    tooltip: t('tooltips.previousStep'),
                  },
            next: {
              label:
                context.currentStep === context.steps.length - 1
                  ? t('common.finish')
                  : t('common.next'),
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
                    ? t('steps.upload.cropRequired')
                    : t('steps.upload.fileRequired')
                  : context.currentStep === context.steps.length - 1
                    ? t('tooltips.finishAnalysis')
                    : t('tooltips.nextStep'),
            },
            custom:
              isUploadStep && !canProceedFromStep1
                ? [
                    {
                      label: hasFile
                        ? t('steps.upload.cropRequired')
                        : t('steps.upload.fileRequired'),
                      icon: 'lucide:AlertCircle',
                      variant: 'outline',
                      disabled: true,
                      tooltip: hasFile
                        ? t('tooltips.validateCrop')
                        : t('steps.upload.instructions'),
                    },
                  ]
                : undefined,
          }
        }}
      />
    </>
  )
}
