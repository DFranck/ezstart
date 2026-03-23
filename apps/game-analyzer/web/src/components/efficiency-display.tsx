'use client'

import { Card, CardContent, CardHeader, Div, H3, P, Progress } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneAnalysis, StatType } from '@game-analyzer/types'

// ── Stat colors (same as rune-card) ──
const STAT_COLORS: Record<StatType, string> = {
  spd: 'text-blue-400',
  cr: 'text-red-400',
  cd: 'text-red-400',
  atk: 'text-orange-400',
  'atk%': 'text-orange-400',
  hp: 'text-green-400',
  'hp%': 'text-green-400',
  def: 'text-slate-400',
  'def%': 'text-slate-400',
  res: 'text-violet-400',
  acc: 'text-violet-400',
}

type Tier = 'sell' | 'keep' | 'good' | 'great' | 'godlike'

function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'godlike': return 'text-yellow-500'
    case 'great': return 'text-green-500'
    case 'good': return 'text-blue-500'
    case 'keep': return 'text-orange-500'
    case 'sell': return 'text-red-500'
  }
}

function getProgressColor(tier: Tier): string {
  switch (tier) {
    case 'godlike': return '[&>div]:bg-yellow-500'
    case 'great': return '[&>div]:bg-green-500'
    case 'good': return '[&>div]:bg-blue-500'
    case 'keep': return '[&>div]:bg-orange-500'
    case 'sell': return '[&>div]:bg-red-500'
  }
}

function getSubstatBarColor(efficiency: number): string {
  if (efficiency >= 80) return '[&>div]:bg-green-500'
  if (efficiency >= 50) return '[&>div]:bg-yellow-500'
  return '[&>div]:bg-red-500'
}

interface EfficiencyDisplayProps {
  analysis: RuneAnalysis
  confidence?: number
}

export function EfficiencyDisplay({ analysis, confidence }: EfficiencyDisplayProps) {
  const t = useTranslations('scan')
  const tLabels = useTranslations('labels')
  const tRune = useTranslations('rune')

  const displayTier = analysis.adjustedTier ?? analysis.tier
  const levelStrictness = analysis.levelStrictness ?? 0

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
            <Div className="flex items-center gap-2">
              <P className={`text-lg font-bold ${getTierColor(displayTier)}`}>{analysis.weightedEfficiency ?? analysis.efficiency}%</P>
              <P className="text-xs text-muted-foreground">({analysis.efficiency}%)</P>
              <P className={`text-sm font-semibold ${getTierColor(displayTier)}`}>
                {t(`efficiency.${displayTier}`)}
              </P>
            </Div>
          </Div>
          <Progress
            value={analysis.weightedEfficiency ?? analysis.efficiency}
            className={`h-3 ${getProgressColor(displayTier)}`}
          />
          {levelStrictness > 0 && (
            <P className="text-xs text-muted-foreground">
              {t('efficiency.levelStrictness', { value: String(levelStrictness) })}
            </P>
          )}
        </Div>

        {/* Potential and grind projections */}
        <Div className="space-y-1">
          {analysis.maxEfficiency !== undefined && (
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('potential12')}</P>
              <P className="font-medium">{analysis.maxEfficiency}%</P>
            </Div>
          )}
          {analysis.grindedEfficiency !== undefined && (
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('afterGrind')}</P>
              <Div className="flex items-center gap-1">
                <P className="font-medium">{analysis.grindedEfficiency}%</P>
                {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                  <P className="text-green-500 text-xs">(+{analysis.grindGain}%)</P>
                )}
              </Div>
            </Div>
          )}
        </Div>

        {/* Per-substat efficiency */}
        <Div className="space-y-2">
          <P className="text-xs font-medium text-muted-foreground uppercase">{tLabels('subStats')}</P>
          {analysis.substats.map((stat, i) => (
            <Div key={i} className="space-y-1">
              <Div className="flex items-center justify-between text-sm">
                <P className={`font-medium ${STAT_COLORS[stat.type]}`}>
                  {stat.type.toUpperCase().replace('%', '%')}
                </P>
                <Div className="flex items-center gap-2">
                  <P className="font-medium">+{stat.value}</P>
                  <P className="text-xs text-muted-foreground">
                    {stat.efficiency}% ({stat.rolls} {stat.rolls > 1 ? tRune('rolls') : tRune('roll')})
                  </P>
                </Div>
              </Div>
              <Progress value={stat.efficiency} className={`h-1.5 ${getSubstatBarColor(stat.efficiency)}`} />
            </Div>
          ))}
        </Div>

        {/* Confidence */}
        {confidence !== undefined && (
          <Div className="pt-2 border-t">
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tLabels('confidence')}</P>
              <P className="font-medium">{Math.round(confidence)}%</P>
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
