'use client'

import { Card, CardContent, CardHeader, Div, H3, P, Progress } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData } from '@game-analyzer/types'

interface EfficiencyDisplayProps {
  rune: RuneData
  confidence?: number
}

/** Max possible roll per stat type (6-star rune) */
const MAX_ROLLS: Record<string, number> = {
  hp: 375,
  'hp%': 8,
  atk: 20,
  'atk%': 8,
  def: 20,
  'def%': 8,
  spd: 6,
  cr: 6,
  cd: 7,
  res: 8,
  acc: 8,
}

interface SubstatEfficiency {
  type: string
  value: number
  maxPossible: number
  percent: number
}

function computeSubstatEfficiency(rune: RuneData): SubstatEfficiency[] {
  return rune.subStats.map((stat) => {
    const maxRoll = MAX_ROLLS[stat.type] ?? 8
    // For a +12 rune, there are up to 4 rolls into substats
    // Each substat's efficiency = value / (maxRoll * number_of_possible_rolls)
    // Simplified: we use value / (maxRoll * 4) as rough efficiency
    const maxPossible = maxRoll * 4
    const percent = Math.min(100, Math.round((stat.value / maxPossible) * 100))
    return { type: stat.type, value: stat.value, maxPossible, percent }
  })
}

function computeOverallEfficiency(rune: RuneData): number {
  if (rune.subStats.length === 0) return 0

  const efficiencies = computeSubstatEfficiency(rune)
  const total = efficiencies.reduce((sum, s) => sum + s.percent, 0)
  // Overall = average substat efficiency, weighted by number of substats vs 4 max
  return Math.round(total / 4)
}

type Tier = 'sell' | 'keep' | 'great' | 'godlike'

function getEfficiencyTier(score: number): Tier {
  if (score >= 80) return 'godlike'
  if (score >= 65) return 'great'
  if (score >= 50) return 'keep'
  return 'sell'
}

function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'godlike':
      return 'text-yellow-500'
    case 'great':
      return 'text-green-500'
    case 'keep':
      return 'text-orange-500'
    case 'sell':
      return 'text-red-500'
  }
}

function getProgressColor(tier: Tier): string {
  switch (tier) {
    case 'godlike':
      return '[&>div]:bg-yellow-500'
    case 'great':
      return '[&>div]:bg-green-500'
    case 'keep':
      return '[&>div]:bg-orange-500'
    case 'sell':
      return '[&>div]:bg-red-500'
  }
}

export function EfficiencyDisplay({ rune, confidence }: EfficiencyDisplayProps) {
  const t = useTranslations('scan')
  const tLabels = useTranslations('labels')

  const overallScore = computeOverallEfficiency(rune)
  const tier = getEfficiencyTier(overallScore)
  const substatEfficiencies = computeSubstatEfficiency(rune)

  return (
    <Card>
      <CardHeader>
        <H3 className="text-lg font-semibold">{t('efficiency.title')}</H3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall score */}
        <Div className="space-y-2">
          <Div className="flex items-center justify-between">
            <P className="text-sm font-medium">{t('efficiency.score')}</P>
            <P className={`text-lg font-bold ${getTierColor(tier)}`}>{overallScore}%</P>
          </Div>
          <Progress
            value={overallScore}
            className={`h-3 ${getProgressColor(tier)}`}
          />
          <P className={`text-sm font-semibold ${getTierColor(tier)}`}>
            {t(`efficiency.${tier}`)}
          </P>
        </Div>

        {/* Per-substat efficiency */}
        <Div className="space-y-2">
          <P className="text-xs font-medium text-muted-foreground uppercase">{tLabels('subStats')}</P>
          {substatEfficiencies.map((stat, i) => (
            <Div key={i} className="space-y-1">
              <Div className="flex items-center justify-between text-sm">
                <P className="text-muted-foreground uppercase">{stat.type}</P>
                <P className="font-medium">+{stat.value} ({stat.percent}%)</P>
              </Div>
              <Progress value={stat.percent} className="h-1.5" />
            </Div>
          ))}
        </Div>

        {/* Confidence */}
        {confidence !== undefined && (
          <Div className="pt-2 border-t">
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tLabels('confidence')}</P>
              <P className="font-medium">{Math.round(confidence * 100)}%</P>
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
