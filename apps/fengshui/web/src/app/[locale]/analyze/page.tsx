/* path: /app/[locale]/analyze/page.tsx */
'use client'

import { callApi } from '@/config/api'
import { THEME_COLORS } from '@/lib/theme-colors'
import { clearStepperState, getStepperState, saveStepperState } from '@/lib/local-plans'
import type { CardinalStepData } from '@/types/bagua'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { Div, Stepper, type StepperTheme } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@/i18n/navigation'

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

export default function AnalyzePage() {
  const [triggerPreview, setTriggerPreview] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const t = useTranslations()
  const router = useRouter()
  const { isAuthenticated, login } = useAuth()

  // Restore stepper state from localStorage
  const [restoredStep, setRestoredStep] = useState(0)
  const [restoredStepData, setRestoredStepData] = useState<
    Record<string, Record<string, unknown>> | undefined
  >(undefined)
  const [isRestored, setIsRestored] = useState(false)

  useEffect(() => {
    try {
      const saved = getStepperState()
      if (saved) {
        // Reconstruct File object from base64 preview if needed
        const uploadData = saved.stepData['upload']
        if (uploadData?.preview && !uploadData.file) {
          try {
            const base64 = uploadData.preview as string
            const match = base64.match(/^data:(image\/\w+);base64,/)
            if (match) {
              const mime = match[1]
              const ext = mime === 'image/png' ? 'png' : 'jpg'
              const binaryStr = atob(base64.split(',')[1]!)
              const bytes = new Uint8Array(binaryStr.length)
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i)
              }
              uploadData.file = new File([bytes], `restored-plan.${ext}`, { type: mime })
            }
          } catch {
            // If reconstruction fails, user will need to re-upload
          }
        }
        setRestoredStep(saved.currentStep)
        setRestoredStepData(saved.stepData)
      }
    } catch {
      // Ignore parse errors
    }
    setIsRestored(true)
  }, [])

  // Refs to track latest state for persistence (avoids stale closures)
  const latestStepDataRef = useRef<Record<string, Record<string, unknown>>>({})
  const currentStepRef = useRef(restoredStep)

  // Keep currentStepRef in sync when restored step changes
  useEffect(() => {
    currentStepRef.current = restoredStep
  }, [restoredStep])

  // Persist stepper state on page unload (covers refresh, tab close, navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStepperState({
        currentStep: currentStepRef.current,
        stepData: latestStepDataRef.current,
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

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
      component: <UploadStep />,
    },
    {
      id: 'cardinal-points',
      title: t('steps.orientation.title'),
      icon: 'lucide:Compass',
      component: <CardinalPointsStep />,
    },
    {
      id: 'analysis',
      title: t('steps.analysis.title'),
      icon: 'lucide:Sparkles',
      component: <AnalysisStep triggerPreview={triggerPreview} />,
      isFinalStep: true, // Marque cette étape comme finale
    },
  ] as const

  // Persist stepper state on step change
  const handleStepChange = useCallback(
    (idx: number, id: string) => {
      logger.debug(`Step changed: ${id} (${idx + 1}/${steps.length})`)
      currentStepRef.current = idx
      // Save current step + data to localStorage
      saveStepperState({
        currentStep: idx,
        stepData: latestStepDataRef.current,
      })
    },
    [steps.length]
  )

  // Save analysis (API or localStorage) then redirect
  const handleSaveAnalysis = useCallback(
    async (allData: Record<string, Record<string, unknown>>) => {
      setIsSaving(true)
      try {
        const cardinalData = (allData['cardinal-points'] as CardinalStepData) ?? {}
        const rotationAngle = cardinalData.rotationAngle ?? 0
        const bearing = cardinalData.bearingFromNorth ?? (rotationAngle + 90) % 360

        const now = new Date()
        const name = `Analyse du ${now.toLocaleDateString()}`

        // Build results from available data
        const results: Record<string, unknown> = {
          bearing,
          cardinalData,
        }

        if (!isAuthenticated) {
          // Save stepper state before redirecting to login so Step 3 is restored after
          saveStepperState({
            currentStep: steps.length - 1,
            stepData: latestStepDataRef.current,
          })
          login()
          setIsSaving(false)
          return
        }

        // Save to API
        try {
          const uploadData = (allData['upload'] ?? {}) as Record<string, unknown>
          const planId = (uploadData.savedPlanId as string) || ''
          const imageData = (uploadData.preview as string) || undefined

          await callApi('/analyses', {
            method: 'POST',
            body: {
              planId: planId || 'unsaved',
              name,
              bearing,
              results,
              imageData,
            },
          })
          toast.success(t('analysis.saveSuccess'))
        } catch (err) {
          logger.error('Failed to save analysis to API:', err)
          toast.error(t('analysis.saveError'))
          return
        }

        // Clear stepper state after successful save
        clearStepperState()

        // Redirect to plans page
        router.push('/dashboard')
      } catch (err) {
        logger.error('Save analysis error:', err)
        toast.error(t('analysis.saveError'))
      } finally {
        setIsSaving(false)
      }
    },
    [isAuthenticated, login, router, t]
  )

  const handleComplete = useCallback(
    (allData: Record<string, Record<string, unknown>>) => {
      logger.info('Analysis complete! Collected data:', allData)
      handleSaveAnalysis(allData)
    },
    [handleSaveAnalysis]
  )

  // Don't render until we've tried restoring state (avoids flash at step 0)
  if (!isRestored) return null

  return (
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
      initialStep={restoredStep}
      initialStepData={restoredStepData}
      withHeaderOffset={false}
      bottomOffset="bottom-10 sm:bottom-0"
      onStepChange={handleStepChange}
      onComplete={handleComplete}
      allowStepNavigation
      theme={fengShuiTheme}
      renderButtons={context => {
        // Keep ref updated for persistence
        latestStepDataRef.current = context.stepData

        const uploadData = context.getStepData('upload') as {
          file?: File
          preview?: string
          _editingState?: {
            isEditing: boolean
            canApply: boolean
            applyHandler: () => Promise<void>
          }
          aiValidation?: {
            isValid: boolean
            score: number
            roomsDetected: number
            feedback: string
          }
        }
        const isUploadStep = context.currentStep === 0
        const hasFile = uploadData?.file
        const editingState = uploadData?._editingState
        const aiValidation = uploadData?.aiValidation

        // Pour Step 1: besoin d'un fichier + validation score >= 20 (or no validation yet but not loading)
        // Disable if score < 20 (invalid plan)
        const isInvalidPlan = aiValidation && aiValidation.score < 20
        const isValidatedPlan = aiValidation && aiValidation.score >= 20
        const canProceedFromStep1 = hasFile && !isInvalidPlan

        const isLastStep = context.currentStep === context.steps.length - 1

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
          // Passer à l'étape suivante (or complete on last step)
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
          // Hide stepper "next" on step 1 when validated — "Valider" button in PlanUploader handles advancing
          next:
            isUploadStep && isValidatedPlan
              ? false
              : {
                  label: isLastStep
                    ? isAuthenticated
                      ? isSaving
                        ? t('analysis.saving')
                        : t('analysis.save')
                      : t('common.login')
                    : t('common.next'),
                  icon: isLastStep
                    ? isAuthenticated
                      ? 'lucide:Save'
                      : 'lucide:LogIn'
                    : 'lucide:ArrowRight',
                  variant: 'default',
                  disabled: (isUploadStep && !canProceedFromStep1) || (isLastStep && isSaving),
                  onClick: handleNext,
                  tooltip:
                    isUploadStep && !canProceedFromStep1
                      ? hasFile
                        ? t('steps.upload.cropRequired')
                        : t('steps.upload.fileRequired')
                      : isLastStep
                        ? t('analysis.save')
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
                    tooltip: hasFile ? t('tooltips.validateCrop') : t('steps.upload.instructions'),
                  },
                ]
              : undefined,
        }
      }}
    />
  )
}
