/**
 * HowItWorksSteps Component - Display ordered steps in a grid
 *
 * Abstraction for "how it works" landing sections. Renders a numbered circle
 * + icon + title + description for each step, in a responsive grid.
 *
 * @example
 * <HowItWorksSteps
 *   steps={[
 *     { step: '1', icon: 'lucide:Download', title: 'Install', description: 'npm i ...' },
 *     { step: '2', icon: 'lucide:Code', title: 'Configure', description: '...' },
 *     { step: '3', icon: 'lucide:Sparkles', title: 'Use', description: '...' },
 *   ]}
 * />
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Icon } from '../icon'
import type { KnownIconName } from '../icon'
import { Div, H3, P } from '../tag'

// ========== Types ==========

export interface HowItWorksStep {
  /** Step indicator (number or short label, ex: '1', '2', 'A') */
  step: number | string
  /** Icon name (lucide:*, fa:*, custom:* format) or rendered ReactNode */
  icon: KnownIconName | React.ReactNode
  /** Step title */
  title: string
  /** Step description */
  description: string
}

export interface HowItWorksStepsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of steps to render */
  steps: HowItWorksStep[]
  /** Number of columns on desktop (default: 3) */
  columns?: 2 | 3 | 4
}

const columnsClassMap = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const

// ========== Component ==========

export const HowItWorksSteps = React.forwardRef<HTMLDivElement, HowItWorksStepsProps>(
  ({ steps, columns = 3, className, ...props }, ref) => {
    return (
      <Div ref={ref} className={cn('grid gap-8', columnsClassMap[columns], className)} {...props}>
        {steps.map((s, index) => (
          <Div key={index} className="flex flex-col items-center gap-4">
            <Div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {s.step}
            </Div>
            <Div className="flex items-center gap-2">
              {typeof s.icon === 'string' ? (
                <Icon name={s.icon as KnownIconName} className="h-5 w-5 text-primary" />
              ) : (
                s.icon
              )}
              <H3 className="text-lg font-semibold">{s.title}</H3>
            </Div>
            <P className="max-w-xs text-sm text-muted-foreground">{s.description}</P>
          </Div>
        ))}
      </Div>
    )
  }
)

HowItWorksSteps.displayName = 'HowItWorksSteps'

export default HowItWorksSteps
