/**
 * FeatureGrid Component - Display Features in Grid Layout
 *
 * Displays features from SEO config in various grid layouts.
 * Supports icons, descriptions, and use cases.
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../card'
import { Badge } from '../badge'

// ========== Types ==========

export interface Feature {
  title: string
  description: string
  longDescription?: string
  icon?: string | React.ReactNode
  keywords?: string[]
  useCases?: string[]
}

export interface FeatureGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Features array from SEO config */
  features: Feature[]
  /** Grid columns (2, 3, or 4) */
  columns?: 2 | 3 | 4
  /** Show long description on hover */
  expandable?: boolean
  /** Show keywords as badges */
  showKeywords?: boolean
  /** Show use cases list */
  showUseCases?: boolean
  /** Card variant */
  variant?: 'default' | 'minimal' | 'bordered' | 'floating'
}

// ========== FeatureGrid Component ==========

export const FeatureGrid = React.forwardRef<HTMLDivElement, FeatureGridProps>(
  (
    {
      features,
      columns = 3,
      expandable = false,
      showKeywords = false,
      showUseCases = false,
      variant = 'default',
      className,
      ...props
    },
    ref
  ) => {
    const gridClasses = cn(
      'grid gap-6',
      columns === 2 && 'grid-cols-1 md:grid-cols-2',
      columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )

    const cardVariantClasses = cn(
      variant === 'minimal' && 'border-0 shadow-none bg-transparent',
      variant === 'bordered' && 'border-2',
      variant === 'floating' && 'shadow-lg hover:shadow-xl transition-shadow duration-300'
    )

    return (
      <div ref={ref} className={gridClasses} {...props}>
        {features.map((feature, index) => (
          <Card
            key={index}
            className={cn(
              cardVariantClasses,
              expandable && 'group cursor-pointer hover:border-primary transition-all'
            )}
          >
            <CardHeader>
              {/* Icon */}
              {feature.icon && (
                <div className="mb-4">
                  {typeof feature.icon === 'string' ? (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                      {feature.icon}
                    </div>
                  ) : (
                    feature.icon
                  )}
                </div>
              )}

              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription className="text-base">
                {feature.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Long Description (expandable) */}
              {expandable && feature.longDescription && (
                <div className="max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-500">
                  <p className="text-sm text-muted-foreground mb-4">
                    {feature.longDescription}
                  </p>
                </div>
              )}

              {/* Keywords */}
              {showKeywords && feature.keywords && feature.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {feature.keywords.slice(0, 3).map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Use Cases */}
              {showUseCases && feature.useCases && feature.useCases.length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {feature.useCases.slice(0, 3).map((useCase, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 text-primary">•</span>
                      <span>{useCase}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
)

FeatureGrid.displayName = 'FeatureGrid'

export default FeatureGrid
