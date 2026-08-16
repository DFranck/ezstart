'use client'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Div,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { AdminAnalyticsOverview } from '../../../../core/types.js'
import type { AuthOverviewSectionTexts } from './texts.js'
import { shortDateLabel } from './helpers.js'

interface SignupTrendChartProps {
  loading: boolean
  data: AdminAnalyticsOverview | undefined
  t: Required<AuthOverviewSectionTexts>
}

/**
 * 30-day signup trend area chart.
 *
 * @internal
 */
export function SignupTrendChart({ loading, data, t }: SignupTrendChartProps) {
  if (loading || !data) {
    return (
      <Div className="flex items-center justify-center h-[260px]">
        <Spinner size="default" />
      </Div>
    )
  }

  const totalSignups = data.signupTrend.reduce((sum, p) => sum + p.count, 0)
  if (totalSignups === 0) {
    return (
      <Div className="flex items-center justify-center h-[260px]">
        <P className="text-sm text-muted-foreground">{t.signupTrendEmpty}</P>
      </Div>
    )
  }

  const chartData = data.signupTrend.map(p => ({
    date: p.date,
    label: shortDateLabel(p.date),
    signups: p.count,
  }))

  const chartConfig = {
    signups: {
      label: t.signupSeriesLabel,
      // Use semantic CSS var resolved at runtime — stays consistent with theme.
      color: 'var(--primary)',
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          fontSize={11}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          fontSize={11}
          allowDecimals={false}
          width={32}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Area
          dataKey="signups"
          type="monotone"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#signupGradient)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
