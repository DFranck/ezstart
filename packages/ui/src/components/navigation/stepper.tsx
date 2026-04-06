'use client'

import { ReactNode, createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'
import {
  paddingX,
  paddingY,
  padding,
  gap,
  fontSize,
  radius,
} from '../../lib/design-system/tokens'
import { stepperVariantConfig } from '../../lib/design-system/variants'
import { Button } from '../button'
import { Icon, KnownIconName } from '../icon'
import { Div, Span } from '../tag'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../feedback/tooltip'

/** Stepper — Multi-step wizard with context API, theming, responsive header.
 * Uses design-system tokens for spacing/sizing. Supports `size` and `variant` props. */

type StepperSize = 'sm' | 'default' | 'lg'
type StepperVariant = 'default' | 'minimal' | 'pills'

interface TooltipButtonProps { button: StepButton; children: ReactNode }

function TooltipButton({ button, children }: TooltipButtonProps) {
  if (!button.tooltip) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{button.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

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

export const useStepper = () => {
  const context = useContext(StepperContext)
  if (!context) throw new Error('useStepper must be used within a StepperProvider')
  return context
}

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

export interface StepperTheme {
  primaryColor?: string
  secondaryColor?: string
  textColor?: string
  mutedColor?: string
  backgroundColor?: string
  gradientDirection?: 'to right' | 'to left' | 'to bottom' | 'to top'
}
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
  size?: StepperSize
  variant?: StepperVariant
  headerOffsetTop?: string
  headerOffsetCollapsed?: string
  bottomOffset?: string
  theme?: StepperTheme
}

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
  size = 'default',
  variant = 'default',
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
      if (step && onStepChange) onStepChange(stepIndex, step.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      goToStep(currentStep + 1)
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      onComplete?.(stepData)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const previousStep = () => {
    if (currentStep > 0) goToStep(currentStep - 1)
  }

  const updateStepData = (stepId: string, data: Record<string, unknown>) =>
    setStepData(prev => ({ ...prev, [stepId]: { ...prev[stepId], ...data } }))
  const getStepData = (stepId: string) => stepData[stepId] || {}
  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex)
  const isStepAccessible = (stepIndex: number) =>
    allowStepNavigation && (stepIndex <= currentStep || isStepCompleted(stepIndex))

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
          <StepperHeader
            steps={steps}
            currentStep={currentStep}
            isStepCompleted={isStepCompleted}
            isStepAccessible={isStepAccessible}
            showStepNumbers={showStepNumbers}
            withHeaderOffset={withHeaderOffset}
            onStepClick={allowStepNavigation ? goToStep : undefined}
            size={size}
            variant={variant}
            theme={theme}
            headerOffsetTop={headerOffsetTop}
            headerOffsetCollapsed={headerOffsetCollapsed}
          />

          <Div className={cn('flex-1 flex flex-col w-full', className)}>
            <Div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 py-4">
              {children || steps[currentStep]?.component}
            </Div>

            <StepperNavigation
              currentStep={currentStep}
              totalSteps={steps.length}
              onNext={nextStep}
              onPrevious={previousStep}
              isLastStep={currentStep === steps.length - 1}
              renderButtons={renderButtons}
              context={contextValue}
              size={size}
              variant={variant}
              theme={theme}
              bottomOffset={bottomOffset}
            />
          </Div>
        </Div>
      </StepperContext.Provider>
    </TooltipProvider>
  )
}

interface StepperHeaderProps {
  steps: Step[]
  currentStep: number
  isStepCompleted: (stepIndex: number) => boolean
  isStepAccessible: (stepIndex: number) => boolean
  showStepNumbers: boolean
  withHeaderOffset?: boolean
  onStepClick?: (stepIndex: number) => void
  size: StepperSize
  variant: StepperVariant
  theme?: StepperTheme
  headerOffsetTop?: string
  headerOffsetCollapsed?: string
}

function StepperHeader({
  steps,
  currentStep,
  isStepCompleted,
  isStepAccessible,
  showStepNumbers,
  withHeaderOffset,
  onStepClick,
  size,
  variant,
  theme,
  headerOffsetTop,
  headerOffsetCollapsed,
}: StepperHeaderProps) {
  const progress = steps.length > 1 ? ((currentStep + 1) / steps.length) * 100 : 100
  const currentStepData = steps[currentStep]
  const gradDir = theme?.gradientDirection || 'to right'
  const themeGradient =
    theme?.primaryColor && theme?.secondaryColor
      ? `linear-gradient(${gradDir}, ${theme.primaryColor}, ${theme.secondaryColor})`
      : theme?.primaryColor || undefined

  const sizeTokens = stepperVariantConfig.size[size]
  const variantTokens = stepperVariantConfig.variant[variant]

  return (
    <div
      className={cn(
        'sticky z-10 bg-card border-b border-border',
        withHeaderOffset ? headerOffsetTop : 'top-0'
      )}
    >
      {/* Desktop: full tab bar — each tab = flex-1 via grid */}
      <div
        role="tablist"
        aria-label="Steps"
        className="hidden md:grid"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = isStepCompleted(index)
          const isAccessible = isStepAccessible(index)
          const isFuture = index > currentStep && !isCompleted

          // Variant-driven tab classes (when no custom theme)
          const variantTabClass = isActive
            ? variantTokens.tab.active
            : isCompleted
              ? variantTokens.tab.completed
              : variantTokens.tab.future

          return (
            <button
              key={step.id}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={!isAccessible}
              onClick={() => isAccessible && onStepClick?.(index)}
              className={cn(
                'relative flex items-center justify-center font-medium transition-colors',
                sizeTokens.tab,
                'border-b-2 -mb-px',
                // Variant-driven styles (unless theme overrides)
                !theme?.primaryColor && variantTabClass,
                !theme?.primaryColor && isActive && 'border-primary bg-accent/50',
                !theme?.primaryColor && isCompleted && !isActive && 'border-primary/50',
                !theme?.primaryColor && isFuture && 'border-transparent',
                // Theme overrides
                theme?.primaryColor && isFuture && 'border-transparent text-muted-foreground',
                isAccessible && !isActive && 'hover:bg-accent/30 cursor-pointer',
                !isAccessible && 'cursor-default'
              )}
              style={
                isActive && theme?.primaryColor
                  ? { borderBottomColor: theme.primaryColor }
                  : isCompleted && !isActive && theme?.primaryColor
                    ? { borderBottomColor: `${theme.primaryColor}80` }
                    : undefined
              }
            >
              <Span
                className={cn(
                  'flex items-center justify-center rounded-full shrink-0',
                  size === 'sm' && 'w-5 h-5 text-[10px]',
                  size === 'default' && 'w-6 h-6 text-xs',
                  size === 'lg' && 'w-7 h-7 text-xs',
                  isActive && !theme?.primaryColor && 'bg-primary text-primary-foreground',
                  isCompleted && !isActive && !theme?.primaryColor && 'bg-primary/80 text-primary-foreground',
                  isFuture && 'bg-muted text-muted-foreground'
                )}
                style={
                  (isActive || isCompleted) && theme?.primaryColor
                    ? { backgroundColor: theme.primaryColor, color: 'white' }
                    : undefined
                }
              >
                {isCompleted && !isActive ? (
                  <Icon name="lucide:Check" className={sizeTokens.icon} />
                ) : (
                  <Icon name={step.icon as KnownIconName} className={sizeTokens.icon} />
                )}
              </Span>

              <Span className="whitespace-nowrap ml-2">{step.title}</Span>

              {showStepNumbers && (
                <Span className={cn(fontSize.xs, 'text-muted-foreground ml-1')}>
                  {index + 1}/{steps.length}
                </Span>
              )}
            </button>
          )
        })}
      </div>

      {/* Mobile: single line step indicator + mini dots */}
      <div className={cn('flex md:hidden items-center justify-between', paddingX.default, paddingY.default)}>
        <Div className={cn('flex items-center', gap.normal)}>
          <Span
            className={cn(
              'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold',
              size === 'sm' && 'w-6 h-6 text-[10px]',
              size === 'default' && 'w-7 h-7 text-xs',
              size === 'lg' && 'w-8 h-8 text-sm'
            )}
            style={
              theme?.primaryColor ? { backgroundColor: theme.primaryColor, color: 'white' } : undefined
            }
          >
            {currentStep + 1}
          </Span>
          <Div className="flex flex-col">
            <Span className={cn(fontSize.sm, 'font-medium text-foreground leading-tight')}>
              {currentStepData?.title}
            </Span>
            <Span className={cn(fontSize.xs, 'text-muted-foreground')}>
              Step {currentStep + 1} of {steps.length}
            </Span>
          </Div>
        </Div>

        {/* Mini step dots */}
        <Div className={cn('flex items-center', gap.tight)}>
          {steps.map((_, index) => (
            <Span
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentStep && 'bg-primary',
                isStepCompleted(index) && index !== currentStep && 'bg-primary/60',
                index > currentStep && !isStepCompleted(index) && 'bg-muted-foreground/30'
              )}
              style={
                (index === currentStep || isStepCompleted(index)) && theme?.primaryColor
                  ? {
                      backgroundColor:
                        index === currentStep ? theme.primaryColor : `${theme.primaryColor}99`,
                    }
                  : undefined
              }
            />
          ))}
        </Div>
      </div>

      {/* Progress bar — height from size tokens */}
      <div className={cn('w-full bg-muted', sizeTokens.progressBar)}>
        <div
          className={cn(
            sizeTokens.progressBar,
            'transition-[width] duration-500 ease-out rounded-r-full',
            !theme?.primaryColor && variantTokens.progressBar
          )}
          style={{
            width: `${progress}%`,
            background: themeGradient,
          }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Step ${currentStep + 1} of ${steps.length}`}
        />
      </div>
    </div>
  )
}

interface StepperNavigationProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  isLastStep: boolean
  renderButtons?: (context: StepperContextType) => StepperButtons
  context: StepperContextType
  size: StepperSize
  variant: StepperVariant
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
  size,
  variant,
  theme,
  bottomOffset = 'bottom-0',
}: StepperNavigationProps) {
  const sizeTokens = stepperVariantConfig.size[size]
  const variantTokens = stepperVariantConfig.variant[variant]

  const gradDir = theme?.gradientDirection || 'to right'
  const nextButtonStyle = theme?.primaryColor
    ? {
        background: theme.secondaryColor
          ? `linear-gradient(${gradDir}, ${theme.primaryColor}, ${theme.secondaryColor})`
          : theme.primaryColor,
        color: 'white',
        border: 'none',
      }
    : undefined

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
      variant: theme?.primaryColor ? 'ghost' : 'brand',
      onClick: onNext,
    },
  }

  const buttons = renderButtons ? renderButtons(context) : defaultButtons

  return (
    <div
      className={cn(
        'fixed z-20 left-0 right-0 flex items-center',
        sizeTokens.navigation,
        variantTokens.navigation,
        bottomOffset
      )}
    >
      {/* Previous button */}
      <Div className="flex-1 flex justify-start">
        {buttons.previous && !buttons.previous.hidden && (
          <TooltipButton button={buttons.previous}>
            <Button
              onClick={buttons.previous.onClick}
              disabled={buttons.previous.disabled}
              variant={buttons.previous.variant || 'outline'}
              size={size}
              className={buttons.previous.className}
            >
              {buttons.previous.icon && (
                <Icon name={buttons.previous.icon as KnownIconName} className={sizeTokens.icon} />
              )}
              <span className="hidden sm:inline">{buttons.previous.label}</span>
            </Button>
          </TooltipButton>
        )}
      </Div>

      {/* Center: custom buttons or step indicator */}
      <Div className={cn('flex items-center', gap.default)}>
        {buttons.custom?.map(
          (btn, index) =>
            !btn.hidden && (
              <TooltipButton key={index} button={btn}>
                <Button
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  variant={btn.variant || 'outline'}
                  size={size}
                  className={btn.className}
                >
                  {btn.icon && <Icon name={btn.icon as KnownIconName} className={sizeTokens.icon} />}
                  <span className="hidden sm:inline">{btn.label}</span>
                </Button>
              </TooltipButton>
            )
        )}
        {!buttons.custom && (
          <Span className={cn(fontSize.sm, 'text-muted-foreground hidden sm:block')}>
            {currentStep + 1} / {totalSteps}
          </Span>
        )}
      </Div>

      {/* Next button */}
      <Div className="flex-1 flex justify-end">
        {buttons.next && !buttons.next.hidden && (
          <TooltipButton button={buttons.next}>
            <Button
              onClick={buttons.next.onClick}
              disabled={buttons.next.disabled}
              variant={buttons.next.variant || 'brand'}
              size={size}
              className={buttons.next.className}
              style={theme?.primaryColor ? nextButtonStyle : undefined}
            >
              <span className="hidden sm:inline">{buttons.next.label}</span>
              {buttons.next.icon && (
                <Icon name={buttons.next.icon as KnownIconName} className={sizeTokens.icon} />
              )}
            </Button>
          </TooltipButton>
        )}
      </Div>
    </div>
  )
}

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
  const handleUpdateData = (newData: Record<string, unknown>) => updateStepData(stepId, newData)
  return <>{children(data, handleUpdateData)}</>
}

export function StepSummary() {
  const { stepData, steps } = useStepper()

  return (
    <Div className={cn('bg-muted/50', radius.lg, padding.default)}>
      <Span className={cn('font-semibold text-foreground block', paddingY.sm)}>Step Summary</Span>
      <Div className={gap.sm}>
        {steps.map(step => {
          const data = stepData[step.id]
          if (!data || Object.keys(data).length === 0) return null

          return (
            <Div key={step.id} className={cn('flex items-center', gap.sm, fontSize.sm)}>
              <Icon name={step.icon as KnownIconName} size={16} className="text-muted-foreground" />
              <Span className="font-medium">{step.title}:</Span>
              <Span className="text-muted-foreground">
                {typeof data === 'object' ? 'Data saved' : String(data)}
              </Span>
            </Div>
          )
        })}
      </Div>
    </Div>
  )
}
