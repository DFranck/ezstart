'use client'

import { ReactNode, createContext, useContext, useState } from 'react'
import { cn } from '../lib/utils'
import { Icon, KnownIconName } from './icon'

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
      <div className={cn('w-full', className)}>
        {/* Header avec les étapes */}
        <StepperHeader
          steps={steps}
          currentStep={currentStep}
          isStepCompleted={isStepCompleted}
          isStepAccessible={isStepAccessible}
          showStepNumbers={showStepNumbers}
          onStepClick={allowStepNavigation ? goToStep : undefined}
        />

        {/* Contenu de l'étape actuelle */}
        <div className="mt-8">{children || steps[currentStep]?.component}</div>

        {/* Navigation */}
        <StepperNavigation
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={nextStep}
          onPrevious={previousStep}
          isLastStep={currentStep === steps.length - 1}
        />
      </div>
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
  onStepClick?: (stepIndex: number) => void
}

function StepperHeader({
  steps,
  currentStep,
  isStepCompleted,
  isStepAccessible,
  showStepNumbers,
  onStepClick,
}: StepperHeaderProps) {
  // progress ratio for mobile bar
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0

  return (
    <div className=" bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
      {/* Mobile / small screens: horizontally scrollable pills */}
      <div className="sm:hidden">
        <div
          role="tablist"
          aria-label="Steps"
          className="flex gap-3 px-4 py-3 overflow-x-auto snap-x snap-mandatory scroll-p-4 [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: 'none' }}
        >
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = isStepCompleted(index)
            const isAccessible = isStepAccessible(index)

            return (
              <button
                key={step.id}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'step' : undefined}
                aria-disabled={!isAccessible}
                onClick={() => isAccessible && onStepClick?.(index)}
                className={cn(
                  'snap-start shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                  isActive && 'border-blue-500 text-blue-700 bg-blue-50',
                  !isActive &&
                    (isCompleted
                      ? 'border-green-500 text-green-700 bg-green-50'
                      : 'border-gray-200 text-gray-600 bg-white'),
                  !isAccessible && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'grid place-items-center w-8 h-8 rounded-full border',
                    isActive
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <Icon name="lucide:Check" className="w-4 h-4" />
                  ) : (
                    <Icon name={step.icon as KnownIconName} className="w-4 h-4" />
                  )}
                </span>
                {/* Title hidden on very small widths if it overflows naturally */}
                <span className="whitespace-nowrap max-w-[12ch] truncate">{step.title}</span>
                {showStepNumbers && (
                  <span className="text-xs text-gray-500">
                    ({index + 1}/{steps.length})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Thin progress bar */}
        <div className="h-1 w-full bg-gray-200">
          <div
            className="h-1 bg-blue-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* >= sm: original wide header with slight tweaks */}
      <div className="hidden sm:block">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between" role="tablist" aria-label="Steps">
              {steps.map((step, index) => {
                const isActive = index === currentStep
                const isCompleted = isStepCompleted(index)
                const isAccessible = isStepAccessible(index)
                const isPast = index < currentStep

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center flex-1">
                      <button
                        role="tab"
                        aria-selected={isActive}
                        aria-current={isActive ? 'step' : undefined}
                        aria-disabled={!isAccessible}
                        onClick={() => isAccessible && onStepClick?.(index)}
                        className={cn(
                          'flex items-center transition-all duration-200 text-left',
                          isAccessible ? 'cursor-pointer' : 'cursor-not-allowed',
                          isActive
                            ? 'text-blue-600'
                            : isPast || isCompleted
                              ? 'text-green-600'
                              : 'text-gray-400'
                        )}
                      >
                        <div
                          className={cn(
                            'min-w-10 h-10 rounded-full border-2 flex items-center justify-center mr-3 transition-all',
                            isActive
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : isCompleted || isPast
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300'
                          )}
                        >
                          {isCompleted ? (
                            <Icon name="lucide:Check" className="w-5 h-5" />
                          ) : (
                            <Icon name={step.icon as KnownIconName} className="w-5 h-5" />
                          )}
                        </div>

                        <div className="text-left">
                          <div className="font-medium">{step.title}</div>
                          {step.description && (
                            <div className="text-xs opacity-75 hidden md:block">
                              {step.description}
                            </div>
                          )}
                          {showStepNumbers && (
                            <div className="text-[11px] text-gray-500 mt-0.5 hidden lg:block">
                              Step {index + 1} of {steps.length}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-1 mx-4 transition-all',
                          isPast || isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
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
      {/* Desktop/tablet */}
      <div className="hidden sm:flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          disabled={currentStep === 0}
          className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors',
            currentStep === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          )}
        >
          <Icon name="lucide:ArrowLeft" className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {totalSteps}
        </div>

        <button
          onClick={onNext}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          <span>{isLastStep ? 'Finish' : 'Next'}</span>
          <Icon name={isLastStep ? 'lucide:Check' : 'lucide:ArrowRight'} className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile bottom bar */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            className={cn(
              'flex-1 inline-flex justify-center items-center gap-2 h-11 rounded-lg border text-sm font-medium transition-all',
              currentStep === 0
                ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 bg-white active:scale-[.99]'
            )}
          >
            <Icon name="lucide:ArrowLeft" className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={onNext}
            className="flex-1 inline-flex justify-center items-center gap-2 h-11 rounded-lg text-sm font-medium bg-blue-600 text-white active:scale-[.99]"
          >
            <span>{isLastStep ? 'Finish' : 'Next'}</span>
            <Icon name={isLastStep ? 'lucide:Check' : 'lucide:ArrowRight'} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* spacer so content isn't hidden by mobile bar */}
      <div className="h-16 sm:hidden" />
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
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Résumé des étapes</h3>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const data = stepData[step.id]
          if (!data || Object.keys(data).length === 0) return null

          return (
            <div key={step.id} className="flex items-center space-x-2 text-sm">
              <Icon name={step.icon as KnownIconName} size={16} className=" text-gray-500" />
              <span className="font-medium">{step.title}:</span>
              <span className="text-gray-600">
                {typeof data === 'object' ? 'Données sauvegardées' : String(data)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
