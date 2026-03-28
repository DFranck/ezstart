'use client'

import { Card, CardContent, CardHeader, Div, H3, P, Progress } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneAnalysis, StatType } from '@gacha-analyzer/types'

// ── Stat colors (same as rune-card) ──
const STAT_COLORS: Record<StatType, string> = {
  spd: 'text-ga-stat-spd',
  cr: 'text-ga-stat-crit',
  cd: 'text-ga-stat-crit',
  atk: 'text-ga-stat-atk',
  'atk%': 'text-ga-stat-atk',
  hp: 'text-ga-stat-hp',
  'hp%': 'text-ga-stat-hp',
  def: 'text-ga-stat-def',
  'def%': 'text-ga-stat-def',
  res: 'text-ga-stat-acc',
  acc: 'text-ga-stat-acc',
}

type Tier = 'sell' | 'keep' | 'good' | 'great' | 'godlike'

function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'godlike': return 'text-ga-tier-godlike'
    case 'great': return 'text-ga-tier-great'
    case 'good': return 'text-ga-tier-good'
    case 'keep': return 'text-ga-tier-keep'
    case 'sell': return 'text-ga-tier-sell'
  }
}

function getProgressColor(tier: Tier): string {
  switch (tier) {
    case 'godlike': return '[&>div]:bg-ga-tier-godlike'
    case 'great': return '[&>div]:bg-ga-tier-great'
    case 'good': return '[&>div]:bg-ga-tier-good'
    case 'keep': return '[&>div]:bg-ga-tier-keep'
    case 'sell': return '[&>div]:bg-ga-tier-sell'
  }
}

function getSubstatBarColor(efficiency: number): string {
  if (efficiency >= 80) return '[&>div]:bg-success'
  if (efficiency >= 50) return '[&>div]:bg-warning'
  return '[&>div]:bg-destructive'
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
          {analysis.potentialEfficiency !== undefined && (
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('potential12')}</P>
              <P className="font-medium">{analysis.potentialEfficiency}%</P>
            </Div>
          )}
          {analysis.grindedEfficiency !== undefined && (
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('afterGrind')}</P>
              <Div className="flex items-center gap-1">
                <P className="font-medium">{analysis.grindedEfficiency}%</P>
                {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                  <P className="text-success-foreground text-xs">(+{analysis.grindGain}%)</P>
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
