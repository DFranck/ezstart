'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '../lib/utils'

// Chart configuration type
export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: {
      light?: string
      dark?: string
    }
  }
}

// Chart Container - wraps all charts with config context
const ChartContext = React.createContext<{
  config: ChartConfig
} | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }
  return context
}

interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig
  children: React.ReactNode
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, children, className, ...props }, ref) => {
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart="chart-container"
          ref={ref}
          className={cn('flex aspect-video justify-center text-xs', className)}
          {...props}
        >
          <ChartStyle config={config} />
          <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = 'ChartContainer'

// Chart Style - generates CSS variables from config
const ChartStyle = ({ config }: { config: ChartConfig }) => {
  const colorConfig = Object.entries(config).reduce(
    (acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color
      }
      if (value.theme?.light) {
        acc[`--color-${key}`] = value.theme.light
      }
      return acc
    },
    {} as Record<string, string>
  )

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(colorConfig)
          .map(([key, value]) => `${key}: ${value};`)
          .join('\n'),
      }}
    />
  )
}

// Chart Tooltip
interface ChartTooltipProps extends React.ComponentProps<typeof RechartsPrimitive.Tooltip> {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
  labelKey?: string
}

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
  }

const ChartTooltipContent: React.ForwardRefExoticComponent<
  ChartTooltipContentProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className
        )}
      >
        {!hideLabel && (
          <div className={cn('font-medium', labelClassName)}>
            {labelFormatter ? labelFormatter(label, payload) : label}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map(
            (
              item: {
                value: number
                name: string
                dataKey?: string
                color?: string
                fill?: string
                stroke?: string
              },
              index: number
            ) => {
              const key = `${nameKey || item.name || item.dataKey || 'value'}`
              const itemConfig = config[key as keyof typeof config]
              const value = formatter
                ? formatter(item.value, item.name, item, index, payload)
                : item.value

              return (
                <div
                  key={item.dataKey}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {!hideIndicator && (
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: item.color || itemConfig?.color,
                        }}
                      />
                    )}
                    <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                  </div>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {value}
                  </span>
                </div>
              )
            }
          )}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

// Chart Legend
const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className
      )}
    >
      {payload.map(item => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemConfig = config[key as keyof typeof config]

        return (
          <div
            key={item.value}
            className={cn(
              'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground'
            )}
          >
            {!hideIcon && (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            <span className="text-muted-foreground">{itemConfig?.label || item.value}</span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = 'ChartLegendContent'

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
}
