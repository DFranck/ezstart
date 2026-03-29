/* path: /app/[locale]/analyze/page.tsx */
'use client'

import { THEME_COLORS } from '@/lib/theme-colors'
import { Div, Stepper, type StepperTheme, WelcomeModal } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

// Dynamic imports for heavy step components (~900 lines total)
// Reduces initial bundle size and improves First Load JS
const AnalysisStep = dynamic(() => import('@/components/steps/AnalysisStep'), {
  loading: () => <Div className="flex items-center justify-center p-8">Loading analysis...</Div>,
})
const CardinalPointsStep = dynamic(() => import('@/components/steps/CardinalPointsStep-v2'), {
  loading: () => <Div className="flex items-center justify-center p-8">Loading compass...</Div>,
})
const UploadStep = dynamic(() => import('@/components/steps/UploadStep'), {
  loading: () => <Div className="flex items-center justify-center p-8">Loading uploader...</Div>,
})

export default function AnalyzePage(): any {
  const [triggerPreview, setTriggerPreview] = useState(0)
  const t = useTranslations()

  // Theme FengShui dynamique (centralisé dans theme-colors.ts)
  // Utilise CSS variables pour éviter les problèmes d'hydratation SSR
  const fengShuiTheme: StepperTheme = {
    primaryColor: THEME_COLORS.cssVars.primary,
    secondaryColor: THEME_COLORS.cssVars.secondary,
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
    logger.debug(`Étape changée: ${id} (${idx + 1}/${steps.length})`)
  }

  const handleComplete = (allData: Record<string, unknown>) => {
    logger.info('Analyse terminée! Données collectées:', allData)
    // Déclencher l'ouverture du preview PDF avec un compteur pour forcer le re-trigger
    setTriggerPreview(prev => prev + 1)
  }

  return (
    <>
      <WelcomeModal
        appName="FengShui"
        title={t('welcome.title')}
        description={t('welcome.description')}
        features={[
          {
            icon: 'lucide:Upload',
            title: t('welcome.feature1.title'),
            description: t('welcome.feature1.description'),
          },
          {
            icon: 'lucide:Compass',
            title: t('welcome.feature2.title'),
            description: t('welcome.feature2.description'),
          },
          {
            icon: 'lucide:Sparkles',
            title: t('welcome.feature3.title'),
            description: t('welcome.feature3.description'),
          },
          {
            icon: 'lucide:FileText',
            title: t('welcome.feature4.title'),
            description: t('welcome.feature4.description'),
          },
        ]}
        ctaText={t('welcome.ctaText')}
      />

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
          const editingState = uploadData?._editingState

          // Pour Step 1: juste besoin d'un fichier uploadé
          const canProceedFromStep1 = hasFile

          // Handler async pour le bouton Next qui auto-valide le crop si nécessaire
          const handleNext = async () => {
            // Si on est sur l'étape upload avec une image et qu'on est en édition
            if (isUploadStep && uploadData.file?.type?.startsWith('image/')) {
              // Si le crop est en cours d'édition et peut être appliqué
              if (editingState?.isEditing && editingState?.canApply) {
                // Auto-valider le crop avant de passer à l'étape suivante
                await editingState.applyHandler()
              }
              // Sinon si aucun crop n'a été validé, on continue quand même
              // (l'image sera utilisée telle quelle)
            }
            // Passer à l'étape suivante
            context.nextStep()
          }

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
                  ? t('common.downloadPlan')
                  : t('common.next'),
              icon:
                context.currentStep === context.steps.length - 1
                  ? 'lucide:Download'
                  : 'lucide:ArrowRight',
              variant: 'brand',
              disabled: isUploadStep && !canProceedFromStep1,
              onClick: handleNext,
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
