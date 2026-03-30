'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Div,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  type ChartConfig,
} from '@ezstart/ui/components'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

import { SET_STAT_TIERS, TIER_WEIGHTS } from '@gacha-analyzer/types'
import type { StatTier } from '@gacha-analyzer/types'

import { SET_KEYS, RADAR_STATS, TIER_STAT_LABELS } from './data-constants'

export function SetRadarChart() {
  const td = useTranslations('data')
  const [set1, setSet1] = useState<string>(SET_KEYS[0]!)
  const [set2, setSet2] = useState<string>('none')

  const hasSet2 = set2 !== '' && set2 !== 'none'

  const radarData = useMemo(() => {
    return RADAR_STATS.map(stat => {
      const tiers1 = SET_STAT_TIERS[set1]
      const tier1 = tiers1?.[stat] as StatTier | undefined
      const val1 = tier1 ? (TIER_WEIGHTS[tier1] ?? 0) : 0

      let val2 = 0
      if (hasSet2) {
        const tiers2 = SET_STAT_TIERS[set2]
        const tier2 = tiers2?.[stat] as StatTier | undefined
        val2 = tier2 ? (TIER_WEIGHTS[tier2] ?? 0) : 0
      }

      return {
        stat: TIER_STAT_LABELS[stat]!,
        set1: val1,
        ...(hasSet2 ? { set2: val2 } : {}),
      }
    })
  }, [set1, set2, hasSet2])

  const chartConfig: ChartConfig = {
    set1: {
      label: set1.charAt(0).toUpperCase() + set1.slice(1),
      color: 'var(--color-ga-stat-spd)',
    },
    ...(hasSet2
      ? {
          set2: {
            label: set2.charAt(0).toUpperCase() + set2.slice(1),
            color: 'var(--color-ga-stat-crit)',
          },
        }
      : {}),
  }

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Set Stat Profile — Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <Div className="flex flex-wrap gap-3 mb-4">
          <Div className="space-y-1">
            <P className="text-xs text-muted-foreground">Set 1</P>
            <Select value={set1} onValueChange={setSet1}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SET_KEYS.map(k => (
                  <SelectItem key={k} value={k}>
                    <Span className="capitalize">{k}</Span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>
          <Div className="space-y-1">
            <P className="text-xs text-muted-foreground">Set 2 (compare)</P>
            <Select value={set2} onValueChange={setSet2}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder={td('none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{td('none')}</SelectItem>
                {SET_KEYS.map(k => (
                  <SelectItem key={k} value={k}>
                    <Span className="capitalize">{k}</Span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>
        </Div>

        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis
              dataKey="stat"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, 1]}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }}
              tickCount={6}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar
              name={(chartConfig.set1?.label ?? 'Set 1') as string}
              dataKey="set1"
              stroke="var(--color-ga-stat-spd)"
              fill="var(--color-ga-stat-spd)"
              fillOpacity={0.25}
            />
            {hasSet2 && (
              <Radar
                name={chartConfig.set2?.label as string}
                dataKey="set2"
                stroke="var(--color-ga-stat-crit)"
                fill="var(--color-ga-stat-crit)"
                fillOpacity={0.25}
              />
            )}
            {hasSet2 && <ChartLegend content={<ChartLegendContent />} />}
          </RadarChart>
        </ChartContainer>

        <P className="text-xs text-muted-foreground mt-2 text-center">
          Values are tier weights: S=1.0, A=0.8, B=0.5, C=0.2, D=0.0
        </P>
      </CardContent>
    </Card>
  )
}
