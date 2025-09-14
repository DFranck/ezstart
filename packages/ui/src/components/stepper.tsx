'use client'

import { ReactNode, createContext, useContext, useState } from 'react'
import { useOnScroll } from '../hooks'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Icon, KnownIconName } from './icon'
import { Div, Span } from './tag'

// Types
export interface Step {
  id: string
  title: string
  icon: string
  description?: string
  component: ReactNode
}

interface StepperContextType {
  currentStep: number
  steps: Step[]
  stepData: Record<string, any>
  goToStep: (stepIndex: number) => void
  nextStep: () => void
  previousStep: () => void
  updateStepData: (stepId: string, data: any) => void
  getStepData: (stepId: string) => any
  isStepCompleted: (stepIndex: number) => boolean
  isStepAccessible: (stepIndex: number) => boolean
}

const StepperContext = createContext<StepperContextType | null>(null)

// Hook pour utiliser le contexte
export const useStepper = () => {
  const context = useContext(StepperContext)
  if (!context) {
    throw new Error('useStepper must be used within a StepperProvider')
  }
  return context
}

// Props pour le composant principal
interface StepperProps {
  steps: Step[]
  initialStep?: number
  onStepChange?: (stepIndex: number, stepId: string) => void
  onComplete?: (allData: Record<string, any>) => void
  className?: string
  withHeaderOffset?: boolean
  showStepNumbers?: boolean
  allowStepNavigation?: boolean
  children?: ReactNode
}

// Composant principal Stepper
export function Stepper({
  steps,
  initialStep = 0,
  onStepChange,
  onComplete,
  className,
  withHeaderOffset = false,
  showStepNumbers = true,
  allowStepNavigation = true,
  children,
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [stepData, setStepData] = useState<Record<string, any>>({})
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex)
      const step = steps[stepIndex]
      if (step && onStepChange) {
        onStepChange(stepIndex, step.id)
      }
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      // Marquer l'étape actuelle comme complétée
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      goToStep(currentStep + 1)
    } else {
      // Dernière étape, appeler onComplete
      onComplete?.(stepData)
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }

  const updateStepData = (stepId: string, data: any) => {
    setStepData(prev => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...data },
    }))
  }

  const getStepData = (stepId: string) => {
    return stepData[stepId] || {}
  }

  const isStepCompleted = (stepIndex: number) => {
    return completedSteps.has(stepIndex)
  }

  const isStepAccessible = (stepIndex: number) => {
    if (!allowStepNavigation) return false
    // Permettre la navigation vers les étapes précédentes ou complétées
    return stepIndex <= currentStep || isStepCompleted(stepIndex)
  }

  const contextValue: StepperContextType = {
    currentStep,
    steps,
    stepData,
    goToStep,
    nextStep,
    previousStep,
    updateStepData,
    getStepData,
    isStepCompleted,
    isStepAccessible,
  }

  return (
    <StepperContext.Provider value={contextValue}>
      <Div className="flex-1 flex flex-col w-full mb-18">
        {/* Header avec les étapes */}
        <StepperHeader
          steps={steps}
          currentStep={currentStep}
          isStepCompleted={isStepCompleted}
          isStepAccessible={isStepAccessible}
          showStepNumbers={showStepNumbers}
          withHeaderOffset={withHeaderOffset}
          onStepClick={allowStepNavigation ? goToStep : undefined}
        />
        <Div className={cn('flex-1 flex flex-col items-center justify-center w-full', className)}>
          {/* Contenu de l'étape actuelle */}
          <div className="py-6">{children || steps[currentStep]?.component}</div>

          {/* Navigation */}
          <StepperNavigation
            currentStep={currentStep}
            totalSteps={steps.length}
            onNext={nextStep}
            onPrevious={previousStep}
            isLastStep={currentStep === steps.length - 1}
          />
        </Div>
      </Div>
    </StepperContext.Provider>
  )
}

// Composant Header pour afficher les étapes
interface StepperHeaderProps {
  steps: Step[]
  currentStep: number
  isStepCompleted: (stepIndex: number) => boolean
  isStepAccessible: (stepIndex: number) => boolean
  showStepNumbers: boolean
  withHeaderOffset?: boolean
  onStepClick?: (stepIndex: number) => void
}

function StepperHeader({
  steps,
  currentStep,
  withHeaderOffset,
  isStepCompleted,
  isStepAccessible,
  showStepNumbers,
  onStepClick,
}: StepperHeaderProps) {
  // progress ratio for mobile bar
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0
  const scrollY = useOnScroll()
  const isTop = scrollY === 0
  return (
    <div
      className={`sticky z-10 bg-background/95 backdrop-blur-sm shadow-sm' ${withHeaderOffset ? (isTop ? 'top-18' : 'top-14') : 'top-0'}`}
    >
      <div
        role="tablist"
        aria-label="Steps"
        className="flex gap-3 px-2 py-3 overflow-x-auto snap-x snap-mandatory scroll-p-4 [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ scrollbarWidth: 'none' }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = isStepCompleted(index)
          const isAccessible = isStepAccessible(index)

          return (
            <Button
              key={step.id}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={!isAccessible}
              onClick={() => isAccessible && onStepClick?.(index)}
              variant={isActive ? 'default' : isCompleted ? 'ezstart' : 'ghost'}
            >
              <Span className="relative flex items-center justify-center mr-2">
                <Icon
                  name="lucide:Check"
                  className={cn(
                    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    isCompleted && !isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon
                  name={step.icon as KnownIconName}
                  className={cn(
                    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0',
                    isActive && 'opacity-100'
                  )}
                />
              </Span>
              {/* Title hidden on very small widths if it overflows naturally */}
              <span className="whitespace-nowrap max-w-[12ch] truncate">{step.title}</span>
              {showStepNumbers && (
                <Span>
                  ({index + 1}/{steps.length})
                </Span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Thin progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-1 bg-ezstart transition-[width] duration-300"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

// Composant Navigation
interface StepperNavigationProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  isLastStep: boolean
}

function StepperNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  isLastStep,
}: StepperNavigationProps) {
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-2 py-4 border-t border-border bg-card">
        <Button
          onClick={onPrevious}
          disabled={currentStep === 0}
          variant={'outline'}
          className={cn(currentStep === 0 && 'text-muted-foreground cursor-not-allowed')}
        >
          <Icon name="lucide:ArrowLeft" className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </div>

        <Button onClick={onNext} variant={'ezstart'}>
          <span className="hidden sm:inline">{isLastStep ? 'Finish' : 'Next'}</span>
          <Icon name={isLastStep ? 'lucide:Check' : 'lucide:ArrowRight'} className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}

// Composant pour afficher le contenu d'une étape avec données persistantes
interface StepContentProps {
  stepId: string
  children: (data: any, updateData: (newData: any) => void) => ReactNode
}

export function StepContent({ stepId, children }: StepContentProps) {
  const { getStepData, updateStepData } = useStepper()
  const data = getStepData(stepId)

  const handleUpdateData = (newData: any) => {
    updateStepData(stepId, newData)
  }

  return <>{children(data, handleUpdateData)}</>
}

// Composant pour afficher un résumé des données
export function StepSummary() {
  const { stepData, steps } = useStepper()

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <h3 className="font-semibold text-foreground mb-3">Résumé des étapes</h3>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const data = stepData[step.id]
          if (!data || Object.keys(data).length === 0) return null

          return (
            <div key={step.id} className="flex items-center space-x-2 text-sm">
              <Icon name={step.icon as KnownIconName} size={16} className="text-muted-foreground" />
              <span className="font-medium">{step.title}:</span>
              <span className="text-muted-foreground">
                {typeof data === 'object' ? 'Données sauvegardées' : String(data)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
