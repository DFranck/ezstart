/**
 * UseCases Component - Display Real-World Use Cases
 *
 * Shows before/after stories with metrics from SEO config.
 * Supports different layouts and visual styles.
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../data-display/card'
import { Badge } from '../data-display/badge'

// ========== Types ==========

export interface UseCase {
  title: string
  before: string
  after: string
  metrics?: {
    timelineBefore?: string
    timelineAfter?: string
    costBefore?: string
    costAfter?: string
  }
}

export interface UseCasesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use cases array from SEO config */
  cases: UseCase[]
  /** Layout variant */
  variant?: 'default' | 'timeline' | 'comparison' | 'cards'
  /** Show metrics */
  showMetrics?: boolean
  /** Title for the section */
  title?: string
  /** Description for the section */
  description?: string
}

// ========== UseCases Component ==========

export const UseCases = React.forwardRef<HTMLDivElement, UseCasesProps>(
  (
    {
      cases,
      variant = 'default',
      showMetrics = true,
      title,
      description,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('space-y-8', className)} {...props}>
        {/* Section Header */}
        {(title || description) && (
          <div className="text-center max-w-3xl mx-auto mb-12">
            {title && <h2 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h2>}
            {description && (
              <p className="text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Use Cases */}
        <div
          className={cn(
            variant === 'cards' && 'grid grid-cols-1 md:grid-cols-2 gap-6',
            variant === 'timeline' && 'space-y-12',
            variant === 'comparison' && 'space-y-8',
            variant === 'default' && 'space-y-8'
          )}
        >
          {cases.map((useCase, index) => (
            <div key={index}>
              {variant === 'timeline' && (
                <TimelineUseCase useCase={useCase} showMetrics={showMetrics} />
              )}
              {variant === 'comparison' && (
                <ComparisonUseCase useCase={useCase} showMetrics={showMetrics} />
              )}
              {(variant === 'default' || variant === 'cards') && (
                <CardUseCase useCase={useCase} showMetrics={showMetrics} />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
)

UseCases.displayName = 'UseCases'

// ========== Timeline Variant ==========

const TimelineUseCase = ({
  useCase,
  showMetrics,
}: {
  useCase: UseCase
  showMetrics: boolean
}) => (
  <div className="relative pl-8 border-l-2 border-primary/30">
    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary" />

    <div className="mb-6">
      <h3 className="text-2xl font-bold mb-4">{useCase.title}</h3>

      {/* Before */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <Badge variant="destructive" className="mb-2">
          Before
        </Badge>
        <p className="text-muted-foreground">{useCase.before}</p>
      </div>

      {/* After */}
      <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
        <Badge variant="default" className="mb-2">
          After
        </Badge>
        <p className="text-foreground">{useCase.after}</p>
      </div>
    </div>

    {/* Metrics */}
    {showMetrics && useCase.metrics && (
      <MetricsDisplay metrics={useCase.metrics} />
    )}
  </div>
)

// ========== Comparison Variant ==========

const ComparisonUseCase = ({
  useCase,
  showMetrics,
}: {
  useCase: UseCase
  showMetrics: boolean
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-2xl">{useCase.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before Column */}
        <div className="space-y-4">
          <Badge variant="destructive">Before</Badge>
          <p className="text-muted-foreground">{useCase.before}</p>

          {showMetrics && useCase.metrics && (
            <div className="space-y-2 pt-4 border-t">
              {useCase.metrics.timelineBefore && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Timeline: </span>
                  <span className="font-medium">{useCase.metrics.timelineBefore}</span>
                </div>
              )}
              {useCase.metrics.costBefore && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Cost: </span>
                  <span className="font-medium">{useCase.metrics.costBefore}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* After Column */}
        <div className="space-y-4">
          <Badge variant="default">After</Badge>
          <p className="text-foreground font-medium">{useCase.after}</p>

          {showMetrics && useCase.metrics && (
            <div className="space-y-2 pt-4 border-t">
              {useCase.metrics.timelineAfter && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Timeline: </span>
                  <span className="font-medium text-primary">
                    {useCase.metrics.timelineAfter}
                  </span>
                </div>
              )}
              {useCase.metrics.costAfter && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Cost: </span>
                  <span className="font-medium text-primary">
                    {useCase.metrics.costAfter}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

// ========== Card Variant ==========

const CardUseCase = ({
  useCase,
  showMetrics,
}: {
  useCase: UseCase
  showMetrics: boolean
}) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>{useCase.title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Before */}
      <div>
        <Badge variant="destructive" className="mb-2">
          Before
        </Badge>
        <CardDescription>{useCase.before}</CardDescription>
      </div>

      {/* After */}
      <div>
        <Badge variant="default" className="mb-2">
          After
        </Badge>
        <p className="text-sm font-medium">{useCase.after}</p>
      </div>

      {/* Metrics */}
      {showMetrics && useCase.metrics && <MetricsDisplay metrics={useCase.metrics} />}
    </CardContent>
  </Card>
)

// ========== Metrics Display ==========

const MetricsDisplay = ({
  metrics,
}: {
  metrics: {
    timelineBefore?: string
    timelineAfter?: string
    costBefore?: string
    costAfter?: string
  }
}) => (
  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
    {metrics.timelineBefore && metrics.timelineAfter && (
      <div>
        <div className="text-xs text-muted-foreground mb-1">Timeline</div>
        <div className="text-sm">
          <span className="line-through text-muted-foreground">
            {metrics.timelineBefore}
          </span>
          <span className="mx-2">→</span>
          <span className="font-bold text-primary">{metrics.timelineAfter}</span>
        </div>
      </div>
    )}

    {metrics.costBefore && metrics.costAfter && (
      <div>
        <div className="text-xs text-muted-foreground mb-1">Cost</div>
        <div className="text-sm">
          <span className="line-through text-muted-foreground">
            {metrics.costBefore}
          </span>
          <span className="mx-2">→</span>
          <span className="font-bold text-primary">{metrics.costAfter}</span>
        </div>
      </div>
    )}
  </div>
)

export default UseCases
