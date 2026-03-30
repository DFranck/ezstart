'use client'

import { ReactNode, createContext, useContext, useState } from 'react'
import { useOnScroll } from '../hooks'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Icon, KnownIconName } from './icon'
import { Div, Section, Span } from './tag'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

/**
 * Stepper Component - Multi-Step Forms & Wizards
 *
 * Fully accessible stepper with context API, theming, and custom navigation.
 * Perfect for multi-step forms, onboarding flows, and complex wizards.
 *
 * @example
 * // Basic usage
 * const steps = [
 *   { id: 'info', title: 'Info', icon: 'lucide:User', component: <StepOne /> },
 *   { id: 'details', title: 'Details', icon: 'lucide:FileText', component: <StepTwo /> }
 * ]
 *
 * <Stepper
 *   steps={steps}
 *   onComplete={(data) => console.log('Completed:', data)}
 * />
 *
 * @example
 * // With theme customization
 * <Stepper
 *   steps={steps}
 *   theme={{
 *     primaryColor: '#10b981',
 *     secondaryColor: '#3b82f6',
 *     gradientDirection: 'to right'
 *   }}
 *   showStepNumbers
 * />
 *
 * @example
 * // With custom navigation buttons
 * <Stepper
 *   steps={steps}
 *   renderButtons={(context) => ({
 *     previous: { label: 'Back', variant: 'outline' },
 *     next: { label: 'Continue', variant: 'default' },
 *     custom: [
 *       { label: 'Save Draft', icon: 'lucide:Save', onClick: handleSave }
 *     ]
 *   })}
 * />
 */

// Composant wrapper pour les boutons avec tooltip
interface TooltipButtonProps {
  button: StepButton
  children: ReactNode
}

function TooltipButton({ button, children }: TooltipButtonProps) {
  if (!button.tooltip) {
    return <>{children}</>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{button.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

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
  stepData: Record<string, Record<string, unknown>>
  goToStep: (stepIndex: number) => void
  nextStep: () => void
  previousStep: () => void
  updateStepData: (stepId: string, data: Record<string, unknown>) => void
  getStepData: (stepId: string) => Record<string, unknown>
  isStepCompleted: (stepIndex: number) => boolean
  isStepAccessible: (stepIndex: number) => boolean
  theme?: StepperTheme
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

// Types pour les boutons conditionnels
export interface StepButton {
  label: string
  icon?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'brand'
  disabled?: boolean
  hidden?: boolean
  onClick?: () => void
  className?: string
  tooltip?: string
}

export interface StepperButtons {
  previous?: StepButton | false
  next?: StepButton | false
  custom?: StepButton[]
}

// Props pour le theming du stepper
export interface StepperTheme {
  primaryColor?: string // Couleur principale (étapes actives/complétées)
  secondaryColor?: string // Couleur secondaire (fond, bordures)
  textColor?: string // Couleur du texte
  mutedColor?: string // Couleur pour les éléments inactifs
  backgroundColor?: string // Couleur de fond des composants
  gradientDirection?: 'to right' | 'to left' | 'to bottom' | 'to top' // Direction du dégradé
}

// Props pour le composant principal
interface StepperProps {
  steps: Step[]
  initialStep?: number
  onStepChange?: (stepIndex: number, stepId: string) => void
  onComplete?: (allData: Record<string, Record<string, unknown>>) => void
  className?: string
  withHeaderOffset?: boolean
  showStepNumbers?: boolean
  allowStepNavigation?: boolean
  children?: ReactNode
  renderButtons?: (context: StepperContextType) => StepperButtons

  // Custom header offsets
  headerOffsetTop?: string
  headerOffsetCollapsed?: string

  // Bottom navigation offset (for mobile bottom nav bars)
  bottomOffset?: string // e.g., 'bottom-16' for 64px mobile nav height

  // Theming
  theme?: StepperTheme
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
  renderButtons,
  headerOffsetTop = 'top-[68px] md:top-[70px]',
  headerOffsetCollapsed = 'top-[48px] md:top-[54px]',
  bottomOffset = 'bottom-0',
  theme,
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [stepData, setStepData] = useState<Record<string, Record<string, unknown>>>({})
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex)
      const step = steps[stepIndex]
      if (step && onStepChange) {
        onStepChange(stepIndex, step.id)
      }
      // Scroll to top smoothly when navigating between steps
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      // Marquer l'étape actuelle comme complétée
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      goToStep(currentStep + 1)
    } else {
      // Dernière étape, marquer comme complétée et appeler onComplete
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      onComplete?.(stepData)
      // Scroll to top on completion
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }

  const updateStepData = (stepId: string, data: Record<string, unknown>) => {
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
  const isTop = useOnScroll() === 0
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
    theme,
  }

  return (
    <TooltipProvider>
      <StepperContext.Provider value={contextValue}>
        <Div className="flex-1 flex flex-col w-full">
          {/* Header avec les étapes */}
          <StepperHeader
            steps={steps}
            currentStep={currentStep}
            isStepCompleted={isStepCompleted}
            isStepAccessible={isStepAccessible}
            showStepNumbers={showStepNumbers}
            withHeaderOffset={withHeaderOffset}
            onStepClick={allowStepNavigation ? goToStep : undefined}
            theme={theme}
            headerOffsetTop={headerOffsetTop}
            headerOffsetCollapsed={headerOffsetCollapsed}
          />
          <Div className={cn('flex-1 flex flex-col items-center justify-center w-full', className)}>
            {/* Contenu de l'étape actuelle */}
            <Section size={'full'}>{children || steps[currentStep]?.component}</Section>

            {/* Navigation */}
            <StepperNavigation
              currentStep={currentStep}
              totalSteps={steps.length}
              onNext={nextStep}
              onPrevious={previousStep}
              isLastStep={currentStep === steps.length - 1}
              renderButtons={renderButtons}
              context={contextValue}
              theme={theme}
              bottomOffset={bottomOffset}
            />
          </Div>
        </Div>
      </StepperContext.Provider>
    </TooltipProvider>
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
  theme?: StepperTheme
  headerOffsetTop?: string
  headerOffsetCollapsed?: string
}

function StepperHeader({
  steps,
  currentStep,
  withHeaderOffset,
  isStepCompleted,
  isStepAccessible,
  showStepNumbers,
  onStepClick,
  theme,
  headerOffsetTop,
  headerOffsetCollapsed,
}: StepperHeaderProps) {
  // progress ratio for mobile bar
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0
  const scrollY = useOnScroll()
  const isTop = scrollY === 0
  return (
    <div
      className={cn(
        'sticky z-10 backdrop-blur-sm transition-all duration-200 ease-out',
        withHeaderOffset ? (isTop ? headerOffsetTop : headerOffsetCollapsed) : 'top-0',
        isTop ? 'bg-background/0' : 'bg-background/80'
      )}
    >
      <div
        role="tablist"
        aria-label="Steps"
        className="flex overflow-x-auto snap-x snap-mandatory scroll-p-4 [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ scrollbarWidth: 'none' }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isLastStep = index === steps.length - 1
          const isCompleted = isStepCompleted(index)
          const isAccessible = isStepAccessible(index)

          // Styles personnalisés pour les boutons avec theme
          const buttonStyle = (() => {
            if (isCompleted && !isActive && theme?.primaryColor && theme?.secondaryColor) {
              return {
                background: `linear-gradient(${theme.gradientDirection || 'to right'}, ${theme.primaryColor}, ${theme.secondaryColor})`,
                color: 'white',
              }
            }
            if (isCompleted && !isActive && theme?.primaryColor) {
              return {
                backgroundColor: theme.primaryColor,
                color: 'white',
              }
            }
            return undefined
          })()

          return (
            <Button
              key={step.id}
              role="tab"
              className="rounded-none"
              aria-selected={isActive}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={!isAccessible}
              onClick={() => isAccessible && onStepClick?.(index)}
              variant={
                isActive ? 'default' : isCompleted && !theme?.primaryColor ? 'brand' : 'ghost'
              }
              style={buttonStyle}
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
          className={cn('h-1 transition-[width] duration-300', !theme?.primaryColor && 'bg-brand')}
          style={{
            width: `${progress}%`,
            background:
              theme?.primaryColor && theme?.secondaryColor
                ? `linear-gradient(${theme.gradientDirection || 'to right'}, ${theme.primaryColor}, ${theme.secondaryColor})`
                : theme?.primaryColor || undefined,
          }}
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
  renderButtons?: (context: StepperContextType) => StepperButtons
  context: StepperContextType
  theme?: StepperTheme
  bottomOffset?: string
}

function StepperNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  isLastStep,
  renderButtons,
  context,
  theme,
  bottomOffset = 'bottom-0',
}: StepperNavigationProps) {
  // Styles personnalisés pour le bouton Next avec theme
  const nextButtonStyle = (() => {
    if (theme?.primaryColor && theme?.secondaryColor) {
      return {
        background: `linear-gradient(${theme.gradientDirection || 'to right'}, ${theme.primaryColor}, ${theme.secondaryColor})`,
        color: 'white',
        border: 'none',
      }
    }
    if (theme?.primaryColor) {
      return {
        backgroundColor: theme.primaryColor,
        color: 'white',
        border: 'none',
      }
    }
    return undefined
  })()

  // Boutons par défaut si renderButtons n'est pas fourni
  const defaultButtons: StepperButtons = {
    previous: {
      label: 'Previous',
      icon: 'lucide:ArrowLeft',
      variant: 'outline',
      disabled: currentStep === 0,
      onClick: onPrevious,
      className: cn(currentStep === 0 && 'text-muted-foreground cursor-not-allowed'),
    },
    next: {
      label: isLastStep ? 'Finish' : 'Next',
      icon: isLastStep ? 'lucide:Check' : 'lucide:ArrowRight',
      variant: theme?.primaryColor ? 'ghost' : 'brand', // ghost pour pouvoir styler avec style
      onClick: onNext,
    },
  }

  const buttons = renderButtons ? renderButtons(context) : defaultButtons

  return (
    <>
      <div
        className={cn(
          'fixed z-20 left-0 right-0 flex justify-between items-center px-2 py-4 border-t border-border bg-card/60 backdrop-blur',
          bottomOffset
        )}
      >
        {/* Bouton Previous */}
        {buttons.previous && !buttons.previous.hidden && (
          <TooltipButton button={buttons.previous}>
            <Button
              onClick={buttons.previous.onClick}
              disabled={buttons.previous.disabled}
              variant={buttons.previous.variant || 'outline'}
              className={buttons.previous.className}
            >
              {buttons.previous.icon && (
                <Icon name={buttons.previous.icon as KnownIconName} className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{buttons.previous.label}</span>
            </Button>
          </TooltipButton>
        )}

        {/* Espace ou boutons custom au centre */}
        <div className="flex items-center gap-2">
          {buttons.custom?.map(
            (btn, index) =>
              !btn.hidden && (
                <TooltipButton key={index} button={btn}>
                  <Button
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                    variant={btn.variant || 'outline'}
                    className={btn.className}
                  >
                    {btn.icon && <Icon name={btn.icon as KnownIconName} className="w-4 h-4" />}
                    <span className="hidden sm:inline">{btn.label}</span>
                  </Button>
                </TooltipButton>
              )
          )}
          {!buttons.custom && (
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </div>
          )}
        </div>

        {/* Bouton Next */}
        {buttons.next && !buttons.next.hidden && (
          <TooltipButton button={buttons.next}>
            <Button
              onClick={buttons.next.onClick}
              disabled={buttons.next.disabled}
              variant={buttons.next.variant || 'brand'}
              className={buttons.next.className}
              style={theme?.primaryColor ? nextButtonStyle : undefined}
            >
              <span className="hidden sm:inline">{buttons.next.label}</span>
              {buttons.next.icon && (
                <Icon name={buttons.next.icon as KnownIconName} className="w-4 h-4" />
              )}
            </Button>
          </TooltipButton>
        )}
      </div>
    </>
  )
}

// Composant pour afficher le contenu d'une étape avec données persistantes
interface StepContentProps {
  stepId: string
  children: (
    data: Record<string, unknown>,
    updateData: (newData: Record<string, unknown>) => void
  ) => ReactNode
}

export function StepContent({ stepId, children }: StepContentProps) {
  const { getStepData, updateStepData } = useStepper()
  const data = getStepData(stepId)

  const handleUpdateData = (newData: Record<string, unknown>) => {
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
