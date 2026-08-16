'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  P,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { RUNE_MARKER_COLORS } from '@gacha-analyzer/types'
import type { RuneMarker } from '@gacha-analyzer/types'
import type { CalculateRuneResult } from '@/hooks/use-calculate-rune'
import type { PlayerProfile } from '@gacha-analyzer/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalculateOutputProps {
  result: CalculateRuneResult | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROFILE_BADGE: Record<PlayerProfile, string> = {
  early: 'bg-success/15 text-success border-success/40',
  mid: 'bg-primary/15 text-primary border-primary/40',
  late: 'bg-destructive/15 text-destructive border-destructive/40',
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MarkerBadge({ marker }: { marker: string }) {
  const color = RUNE_MARKER_COLORS[marker as RuneMarker] ?? 'text-foreground'
  return <Div className={`text-2xl font-black tracking-wide ${color}`}>{marker}</Div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <H3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </H3>
  )
}

function AdviceBadge({ tier }: { tier: string }) {
  const colorMap: Record<string, string> = {
    sell: 'bg-destructive/15 text-destructive border-destructive/40',
    keep: 'bg-success/15 text-success border-success/40',
    good: 'bg-primary/15 text-primary border-primary/40',
    great: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
    godlike: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
    grind: 'bg-success/15 text-success border-success/40',
    upgrade: 'bg-primary/15 text-primary border-primary/40',
  }
  const cls = colorMap[tier] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <Badge variant="outline" className={`text-sm font-bold uppercase ${cls}`}>
      {tier}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CalculateOutput({ result }: CalculateOutputProps) {
  const t = useTranslations('calculate')
  const [activeProfile, setActiveProfile] = useState<PlayerProfile>('mid')

  if (!result) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center">
        <CardContent className="text-center">
          <P className="text-muted-foreground">{t('output.placeholder')}</P>
        </CardContent>
      </Card>
    )
  }

  const { analysis, markerResult } = result
  const { marker, comparisons, gemSimulation } = markerResult

  // Progressive advice per profile
  const advice = analysis.progressiveAdvice

  // Efficiency section
  const currentEff =
    analysis.adjustedSetWeighted ?? analysis.weightedEfficiency ?? analysis.efficiency
  const grindEff = analysis.grindedEfficiency

  // Structure
  const grindableCount = analysis.substats.filter(s => s.grindable).length
  const deadStats = analysis.substats.filter(s => !s.grindable && s.efficiency < 20)

  return (
    <Div className="space-y-4">
      {/* Header: marker */}
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-4">
          <P className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('output.marker')}
          </P>
          <MarkerBadge marker={marker} />
          {advice && (
            <Div className="mt-1 flex flex-col items-center gap-1 text-center">
              <AdviceBadge tier={advice.action} />
              <P className="max-w-xs text-xs text-muted-foreground">{advice.reason}</P>
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Rarity Comparison */}
      {comparisons.length > 0 && (
        <Card>
          <CardHeader>
            <SectionTitle>{t('output.rarityComparison')}</SectionTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Div className="min-w-[360px] space-y-1">
              {/* Header row */}
              <Div className="grid grid-cols-5 gap-1 text-xs font-semibold text-muted-foreground">
                <Div>{t('output.stat')}</Div>
                <Div className="text-right">{t('output.value')}</Div>
                <Div className="text-right">{t('output.heroMax')}</Div>
                <Div className="text-right">{t('output.legendMax')}</Div>
                <Div className="text-right">{t('output.status')}</Div>
              </Div>
              {comparisons.map(c => (
                <Div key={c.stat} className="grid grid-cols-5 gap-1 rounded py-1 text-xs">
                  <Span className="font-medium">{c.stat}</Span>
                  <Span className="text-right font-bold">{c.value}</Span>
                  <Span className="text-right text-muted-foreground">{c.heroMax}</Span>
                  <Span className="text-right text-muted-foreground">{c.legendMax}</Span>
                  <Span className="text-right">
                    {c.isAboveHeroMax ? (
                      <Badge
                        variant="outline"
                        className="px-1 py-0 text-[10px] bg-success/15 text-success border-success/40"
                      >
                        {t('output.aboveHero')}
                      </Badge>
                    ) : (
                      <Span className="text-muted-foreground">{pct(c.ratioVsLegendMax * 100)}</Span>
                    )}
                  </Span>
                </Div>
              ))}
            </Div>
          </CardContent>
        </Card>
      )}

      {/* Structure */}
      <Card>
        <CardHeader>
          <SectionTitle>{t('output.structure')}</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Div className="flex items-center justify-between text-sm">
            <Span className="text-muted-foreground">{t('output.grindable')}</Span>
            <Span className="font-semibold">{grindableCount}/4</Span>
          </Div>
          {deadStats.length > 0 && (
            <Div className="flex flex-wrap gap-1">
              <Span className="text-xs text-muted-foreground">{t('output.deadStats')}:</Span>
              {deadStats.map(s => (
                <Badge
                  key={s.type}
                  variant="outline"
                  className="px-1 py-0 text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                >
                  {s.type}
                </Badge>
              ))}
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Efficiency */}
      <Card>
        <CardHeader>
          <SectionTitle>{t('output.efficiency')}</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Div className="flex items-center justify-between text-sm">
            <Span className="text-muted-foreground">{t('output.current')}</Span>
            <Span className="font-bold text-foreground">{pct(currentEff)}</Span>
          </Div>
          {grindEff !== undefined && (
            <Div className="flex items-center justify-between text-sm">
              <Span className="text-muted-foreground">{t('output.afterGrind')}</Span>
              <Span className="font-bold text-success">{pct(grindEff)}</Span>
            </Div>
          )}
          {analysis.maxEfficiency !== undefined && (
            <Div className="flex items-center justify-between text-sm">
              <Span className="text-muted-foreground">{t('output.potential12')}</Span>
              <Span className="font-semibold text-muted-foreground">
                {pct(analysis.maxEfficiency)}
              </Span>
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Gem Simulation */}
      {gemSimulation && (
        <Card>
          <CardHeader>
            <SectionTitle>{t('output.gemSimulation')}</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs bg-orange-500/15 text-orange-400 border-orange-500/40"
              >
                {t('output.gem', { from: gemSimulation.removeStat, to: gemSimulation.replaceStat })}
              </Badge>
              <Span className="text-xs text-muted-foreground">→</Span>
              <MarkerBadge marker={gemSimulation.markerPostGem} />
            </Div>
          </CardContent>
        </Card>
      )}

      {/* Player Recommendation */}
      <Card>
        <CardHeader>
          <SectionTitle>{t('output.recommendation')}</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Profile selector */}
          <Div className="flex gap-2">
            {(['early', 'mid', 'late'] as PlayerProfile[]).map(p => (
              <Button
                key={p}
                variant={activeProfile === p ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setActiveProfile(p)}
              >
                {t(`form.profile_${p}`)}
              </Button>
            ))}
          </Div>
          {/* Tier badge */}
          <Div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`px-3 py-1 text-sm font-bold uppercase ${PROFILE_BADGE[activeProfile]}`}
            >
              {analysis.profile === activeProfile && advice ? advice.action : analysis.tier}
            </Badge>
            <P className="text-xs text-muted-foreground">
              {analysis.weightedEfficiency !== undefined
                ? `${pct(analysis.weightedEfficiency)} weighted eff.`
                : '—'}
            </P>
          </Div>
        </CardContent>
      </Card>
    </Div>
  )
}
