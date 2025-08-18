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
  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = isStepCompleted(index)
              const isAccessible = isStepAccessible(index)
              const isPast = index < currentStep

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Étape */}
                  <div className="flex items-center flex-1">
                    <button
                      onClick={() => onStepClick?.(index)}
                      disabled={!isAccessible}
                      className={cn(
                        'flex items-center transition-all duration-200',
                        isAccessible ? 'cursor-pointer' : 'cursor-not-allowed',
                        isActive
                          ? 'text-blue-600'
                          : isPast || isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400'
                      )}
                    >
                      {/* Icône de l'étape */}
                      <div
                        className={cn(
                          'min-w-10 h-10 rounded-full border-2 flex items-center justify-center mr-3 transition-all',
                          isActive
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : isPast
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300'
                        )}
                      >
                        {isCompleted ? (
                          <Icon name="lucide:Check" className="w-5 h-5" />
                        ) : (
                          <Icon name={step.icon as any} className="w-5 h-5" />
                        )}
                      </div>

                      {/* Texte de l'étape */}
                      <div className="text-left">
                        <div className="font-medium">{step.title}</div>
                        {step.description && (
                          <div className="text-xs opacity-75 hidden sm:block">
                            {step.description}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Ligne de connexion */}
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
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
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
        <span>Précédent</span>
      </button>

      <div className="text-sm text-gray-500">
        Étape {currentStep + 1} sur {totalSteps}
      </div>

      <button
        onClick={onNext}
        className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
      >
        <span>{isLastStep ? 'Terminer' : 'Suivant'}</span>
        <Icon name={isLastStep ? 'lucide:Check' : 'lucide:ArrowRight'} className="w-4 h-4" />
      </button>
    </div>
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
