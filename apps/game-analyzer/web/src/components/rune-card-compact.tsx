'use client'

import { Badge, Card, CardContent, Div, P, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, BuildArchetype, ProgressiveAction, RollBreakdown } from '@game-analyzer/types'
import { BUILD_ARCHETYPES } from '@game-analyzer/types'
import { GEM_ICONS, GRIND_ICONS } from '../config/game-assets'
import { SetIcon } from './rune-card-utils'

const QUALITY_COLORS: Record<RuneQuality, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-muted-foreground',
}

const ADVICE_COLORS: Record<ProgressiveAction, string> = {
  sell: 'text-destructive-foreground',
  upgrade: 'text-ga-roll-rare',
  keep: 'text-success-foreground',
  grind: 'text-ga-roll-hero',
}

const ADVICE_BG: Record<ProgressiveAction, string> = {
  sell: 'bg-destructive/10 border-destructive/30',
  upgrade: 'bg-ga-roll-rare/10 border-ga-roll-rare/30',
  keep: 'bg-success/10 border-success/30',
  grind: 'bg-ga-roll-hero/10 border-ga-roll-hero/30',
}

const ADVICE_ICONS: Record<ProgressiveAction, string> = {
  upgrade: '\u2191',
  keep: '\u2713',
  grind: '\u2699',
  sell: '\u2715',
}

type RollQualityTier = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

function getRollQualityTier(rollQuality: number): RollQualityTier {
  if (rollQuality >= 90) return 'legend'
  if (rollQuality >= 75) return 'hero'
  if (rollQuality >= 50) return 'rare'
  if (rollQuality >= 25) return 'magic'
  return 'normal'
}

function getRollQualityColor(rollQuality: number): string {
  return QUALITY_COLORS[getRollQualityTier(rollQuality)] ?? 'text-foreground'
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

function getRollDots(rolls: number): string {
  return '\u25CF'.repeat(rolls)
}

const ROLL_TIER_BG: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/30',
  hero: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/30',
  rare: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/30',
  magic: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/30',
  normal: 'bg-muted text-muted-foreground border-border',
}

function isPercentStat(type: StatType): boolean {
  return ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc'].includes(type)
}

function formatRollValue(type: StatType, value: number): string {
  return isPercentStat(type) ? `${value}%` : `${value}`
}

interface RuneCardCompactProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
}

export function RuneCardCompact({ rune, analysis, confidence }: RuneCardCompactProps) {
  const tRune = useTranslations('rune')

  const quality = rune.quality ?? 'normal'
  const rollQualityTier = analysis?.rollQualityTier ?? 'normal'
  const rollQualityPostGem = analysis?.rollQualityPostGem ?? 'normal'
  const advice = analysis?.progressiveAdvice

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* ── Row 1: Set, Slot, Level, Quality | Roll Quality + Advice ── */}
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-1.5">
            <SetIcon set={rune.set} className="w-5 h-5" />
            <P className="text-sm font-bold capitalize">{rune.set}</P>
            <P className="text-xs text-muted-foreground">({rune.slot})</P>
            <Badge variant="secondary" className="text-[10px] px-1 py-0">+{rune.level}</Badge>
            <Badge className={`border text-[10px] px-1 py-0 ${
              quality === 'legend' ? 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend' :
              quality === 'hero' ? 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero' :
              quality === 'rare' ? 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare' :
              quality === 'magic' ? 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic' :
              'bg-muted text-muted-foreground'
            }`}>
              {tRune(`quality.${quality}`)}
            </Badge>
          </Div>
          <Div className="flex items-center gap-2">
            {analysis && (
              <P className="text-xs font-semibold">
                <span className="text-muted-foreground">{tRune('currentRolls')}: </span>
                <span className={QUALITY_COLORS[rollQualityTier]}>
                  {tRune(`rollQuality.${rollQualityTier}`)} {analysis.rollQualityPercent}%
                </span>
                {rollQualityPostGem !== rollQualityTier && (
                  <>
                    <span className="text-muted-foreground"> | {tRune('afterGemRolls')}: </span>
                    <span className={QUALITY_COLORS[rollQualityPostGem]}>
                      {tRune(`rollQuality.${rollQualityPostGem}`)} {analysis.rollQualityPostGemPercent}%
                    </span>
                  </>
                )}
              </P>
            )}
            {advice && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={`border text-[10px] px-1.5 py-0 font-bold ${ADVICE_BG[advice.action]} ${ADVICE_COLORS[advice.action]}`}>
                      {ADVICE_ICONS[advice.action]} {advice.action.toUpperCase()}
                      {advice.action === 'sell'
                        ? (advice.sellProbability > 0 ? ` \u2014 ${tRune('sellRisk', { percent: String(advice.sellProbability) })}` : '')
                        : (advice.sellProbability > 0 ? ` \u2014 ${tRune('keepChance', { percent: String(100 - advice.sellProbability) })}` : '')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <P className="text-xs font-medium">{advice.reasonKey ? tRune(`adviceReason.${advice.reasonKey}`, advice.reasonParams ?? {}) : advice.reason}</P>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Div>
        </Div>

        {/* ── Row 2: Main stat ── */}
        <Div className="flex items-center gap-2">
          <P className="text-sm font-bold text-foreground">
            {formatStatLabel(rune.mainStat.type)} {formatStatValue(rune.mainStat.type, rune.mainStat.value)}
          </P>
          {rune.innateStat && (
            <P className="text-xs text-muted-foreground">
              ({formatStatLabel(rune.innateStat.type)} {formatStatValue(rune.innateStat.type, rune.innateStat.value)})
            </P>
          )}
        </Div>

        {/* ── Separator ── */}
        <Div className="border-t border-border" />

        {/* ── Row 3: Substats with roll breakdown ── */}
        <Div className="space-y-1">
          {rune.subStats.map((stat, i) => {
            const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
            const breakdown = subAnalysis?.rollBreakdown
            return (
              <Div key={i} className="flex items-center justify-between gap-2">
                <Div className="flex items-center gap-1 min-w-0">
                  <P className="text-xs text-muted-foreground shrink-0">{formatStatLabel(stat.type)}</P>
                  <P className={`text-xs font-semibold shrink-0 ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}>
                    {formatStatValue(stat.type, stat.value)}
                  </P>
                  {subAnalysis?.isGemTarget && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/40 bg-warning/10 text-warning-foreground shrink-0">
                      {tRune('gemable')}
                    </Badge>
                  )}
                </Div>
                {breakdown && breakdown.length > 0 && (
                  <Div className="flex items-center gap-0.5 shrink-0">
                    {breakdown.map((roll, j) => (
                      <Badge key={j} variant="outline" className={`text-[9px] px-1 py-0 leading-tight border ${ROLL_TIER_BG[roll.tier]}`}>
                        {formatRollValue(stat.type, roll.value)}
                      </Badge>
                    ))}
                  </Div>
                )}
              </Div>
            )
          })}
        </Div>

        {/* ── Row 4: Potential + Grind (inline) ── */}
        {analysis && (
          <Div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {analysis.potentialEfficiency !== undefined && (
              <P>
                <span className="font-medium">{tRune('potential12')}:</span> {analysis.potentialEfficiency}%
              </P>
            )}
            {analysis.grindedEfficiency !== undefined && (
              <P>
                <span className="font-medium">{tRune('afterGrind')}:</span> {analysis.grindedEfficiency}%
                {analysis.grindGain !== undefined && analysis.grindGain > 0 && (
                  <span className="text-success-foreground"> (+{analysis.grindGain}%)</span>
                )}
              </P>
            )}
          </Div>
        )}

        {/* ── Row 5: Archetype optimizations (compact) ── */}
        {analysis?.archetypeOptimizations && analysis.archetypeOptimizations.length > 0 && (
          <Div className="space-y-1">
            {analysis.archetypeOptimizations.map(opt => {
              const archKey = opt.archetype as BuildArchetype
              const emoji = BUILD_ARCHETYPES[archKey]?.emoji ?? ''
              return (
                <Div key={opt.archetype} className="flex items-center gap-1.5 text-xs flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 cursor-default shrink-0 ${
                      opt.matchCount >= 4 ? 'bg-ga-roll-legend/15 border-ga-roll-legend/40 text-ga-roll-legend' :
                      'bg-success/15 border-success/40 text-success-foreground'
                    }`}
                  >
                    {emoji} {tRune(`archetype.${archKey}`)} {opt.matchCount}/4
                  </Badge>
                  {opt.isPerfect ? (
                    <P className="text-success-foreground text-[10px]">{'\u2713'} {tRune('perfectBuild')}</P>
                  ) : opt.gemTarget && (
                    <Div className="flex items-center gap-1">
                      <img src={GEM_ICONS.legend} alt="gem" className="w-3.5 h-3.5" />
                      <P className="text-[10px] text-muted-foreground">
                        {tRune('gemSwap', { remove: formatStatLabel(opt.gemTarget.remove), replace: formatStatLabel(opt.gemTarget.replace) })}
                      </P>
                    </Div>
                  )}
                  {opt.grindTargets.length > 0 && (
                    <Div className="flex items-center gap-1">
                      <img src={GRIND_ICONS.legend} alt="grind" className="w-3.5 h-3.5" />
                      <P className="text-[10px] text-muted-foreground">{opt.grindTargets.map(s => formatStatLabel(s)).join(', ')}</P>
                    </Div>
                  )}
                  <P className="text-[10px] text-muted-foreground">{tRune('postOptim', { score: String(opt.postOptimScore) })}</P>
                </Div>
              )
            })}
          </Div>
        )}

        {/* ── OCR Confidence ── */}
        {confidence !== undefined && (
          <Div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Div className="flex items-center gap-1 cursor-default">
                    <Div className={`h-1.5 w-1.5 rounded-full ${
                      confidence >= 80 ? 'bg-success' : confidence >= 50 ? 'bg-warning' : 'bg-destructive'
                    }`} />
                    <P className="text-[10px] text-muted-foreground">{Math.round(confidence)}%</P>
                  </Div>
                </TooltipTrigger>
                <TooltipContent>
                  <P className="text-xs">{tRune('ocrConfidence')}: {Math.round(confidence)}%</P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
