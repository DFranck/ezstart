'use client'

import { Badge, Card, CardContent, Div, P, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, ProgressiveAction, StatTier } from '@game-analyzer/types'
import { SET_STAT_TIERS, SET_STRENGTH_THRESHOLD_BONUS, SUBSTAT_ROLL_RANGES, ANCIENT_SUBSTAT_BASE_RANGES } from '@game-analyzer/types'
import { GEM_ICONS } from '../config/game-assets'
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

const STAT_TIER_COLORS: Record<StatTier, string> = {
  S: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/40',
  A: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/40',
  B: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  C: 'bg-muted/30 text-muted-foreground border-border/40',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
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

// ── Innate tier badge — S/A en innate = malus (stat gâchée, non grindable), D = stat morte ──
const INNATE_TIER_MALUS: Record<StatTier, string> = {
  S: 'bg-destructive/15 text-destructive border-destructive/40',
  A: 'bg-destructive/15 text-destructive border-destructive/40',
  B: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  C: 'bg-muted/30 text-muted-foreground border-border/40',
  D: 'bg-destructive/10 text-destructive border-destructive/30',
}

/** Récupère le tier d'une stat pour un set donné */
function getStatTier(set: string, stat: string): StatTier {
  return SET_STAT_TIERS[set]?.[stat as StatType] ?? 'C'
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
            {rune.isAncient && (
              <Badge className="border text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/40">
                Ancient
              </Badge>
            )}
          </Div>
          {advice && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`border text-[10px] px-1.5 py-0 font-bold ${ADVICE_BG[advice.action]} ${ADVICE_COLORS[advice.action]}`}>
                    {ADVICE_ICONS[advice.action]} {advice.action.toUpperCase()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <P className="text-xs font-medium">{advice.reasonKey ? tRune(`adviceReason.${advice.reasonKey}`, advice.reasonParams ?? {}) : advice.reason}</P>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Div>

        {/* ── Row 2: Main stat ── */}
        <Div className="flex items-center gap-2">
          <P className="text-sm font-bold text-foreground">
            {formatStatLabel(rune.mainStat.type)} {formatStatValue(rune.mainStat.type, rune.mainStat.value)}
          </P>
          {rune.innateStat && (() => {
            const innateTier = getStatTier(rune.set, rune.innateStat.type)
            const isInnateMalus = innateTier === 'S' || innateTier === 'A' || innateTier === 'D'
            return (
              <Div className="flex items-center gap-1">
                <P className="text-xs text-muted-foreground">
                  ({formatStatLabel(rune.innateStat.type)} {formatStatValue(rune.innateStat.type, rune.innateStat.value)})
                </P>
                <Badge variant="outline" className={`text-[7px] px-0.5 py-0 font-bold ${INNATE_TIER_MALUS[innateTier]}`}>
                  {isInnateMalus && '\u26A0\uFE0F'}{innateTier}
                </Badge>
              </Div>
            )
          })()}
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
                  {analysis?.subStatTiers?.[stat.type] && (
                    <Badge variant="outline" className={`text-[7px] px-0.5 py-0 font-bold ${STAT_TIER_COLORS[analysis.subStatTiers[stat.type] as StatTier]}`}>
                      {analysis.subStatTiers[stat.type]}
                    </Badge>
                  )}
                  <P className={`text-xs font-semibold shrink-0 ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}>
                    {subAnalysis?.maxValue
                      ? `${formatStatValue(stat.type, stat.value)}/${isPercentStat(stat.type) ? subAnalysis.maxValue + '%' : subAnalysis.maxValue}`
                      : formatStatValue(stat.type, stat.value)
                    }
                  </P>
                  {subAnalysis && (
                    <P className="text-[10px] text-muted-foreground shrink-0">
                      {Math.round(subAnalysis.efficiency)}%
                    </P>
                  )}
                  {subAnalysis?.isGemTarget && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/40 bg-warning/10 text-warning-foreground shrink-0">
                      <img src={GEM_ICONS.legend} alt="gem" className="w-3 h-3 inline" />
                      gem target
                    </Badge>
                  )}
                </Div>
                {subAnalysis && breakdown && breakdown.length > 1 && (() => {
                  // Show only powerup rolls (exclude base) — each individual roll as a badge
                  const suffix = isPercentStat(stat.type) ? '%' : ''
                  const rollMax = SUBSTAT_ROLL_RANGES[stat.type]?.max ?? 0
                  const powerupRolls = breakdown.slice(1)
                  return (
                    <Div className="flex items-center gap-0.5 shrink-0">
                      {powerupRolls.map((roll, j) => {
                        const q = rollMax ? (roll.value / rollMax) * 100 : 0
                        const tier: RuneQuality = q >= 90 ? 'legend' : q >= 75 ? 'hero' : q >= 50 ? 'rare' : q >= 25 ? 'magic' : 'normal'
                        return (
                          <Badge key={j} variant="outline" className={`text-[9px] px-1 py-0 leading-tight border ${ROLL_TIER_BG[tier]}`}>
                            {roll.value}/{rollMax}{suffix}
                          </Badge>
                        )
                      })}
                    </Div>
                  )
                })()}
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

        {/* ── Score Breakdown ── */}
        {analysis && (
          <Div className="border-t border-border pt-1.5 space-y-0.5 text-[10px] leading-tight">
            {rune.isAncient && (
              <P className="text-amber-400">
                Ancient rune (ranges +1)
              </P>
            )}
            {analysis.setWeightedEfficiency !== undefined && (
              <P className="text-muted-foreground">
                Set Eff: {analysis.setWeightedEfficiency}%
              </P>
            )}
            {analysis.qualityPenalty !== undefined && analysis.qualityPenalty !== 0 && (
              <P className="text-destructive">
                {tRune(`quality.${quality}`)} quality: {analysis.qualityPenalty}
              </P>
            )}
            {analysis.innateScore !== undefined && analysis.innateScore !== 0 && (
              <P className={analysis.innateScore < 0 ? 'text-destructive' : 'text-success-foreground'}>
                Innate {rune.innateStat ? formatStatLabel(rune.innateStat.type) : ''}{analysis.innateTier ? ` [${analysis.innateTier}]` : ''}: {analysis.innateScore > 0 ? '+' : ''}{analysis.innateScore}
              </P>
            )}
            {analysis.mismatchPenalty !== undefined && analysis.mismatchPenalty !== 0 && (
              <P className="text-destructive">
                Stats mismatch: {analysis.mismatchPenalty}
              </P>
            )}
            {analysis.lowRollPenalty !== undefined && analysis.lowRollPenalty !== 0 && (
              <P className="text-destructive">
                Low-roll penalty: {analysis.lowRollPenalty}
              </P>
            )}
            {analysis.nonGrindablePenalty !== undefined && analysis.nonGrindablePenalty !== 0 && (
              <P className="text-destructive">
                Non-grindable penalty: {analysis.nonGrindablePenalty}
              </P>
            )}
            {analysis.setStrength && analysis.setStrength !== 'S' && (
              <P className="text-success-foreground">
                Set {rune.set} ({analysis.setStrength}): +{SET_STRENGTH_THRESHOLD_BONUS[analysis.setStrength] ?? 0}% seuils
              </P>
            )}
            {/* ── Score total ── */}
            {(() => {
              const base = analysis.setWeightedEfficiency ?? 0
              const qualityPen = analysis.qualityPenalty ?? 0
              const innate = analysis.innateScore ?? 0
              const mismatchPen = analysis.mismatchPenalty ?? 0
              const lowRoll = analysis.lowRollPenalty ?? 0
              const nonGrind = analysis.nonGrindablePenalty ?? 0
              const total = Math.round((base + qualityPen + innate + mismatchPen + lowRoll + nonGrind) * 100) / 100
              const hasPenalties = qualityPen !== 0 || innate !== 0 || mismatchPen !== 0 || lowRoll !== 0 || nonGrind !== 0
              return hasPenalties ? (
                <>
                  <Div className="border-t border-dashed border-border my-0.5" />
                  <P className="text-muted-foreground font-medium">
                    Score: {total}
                  </P>
                </>
              ) : null
            })()}
            {advice && (
              <P className={`font-bold ${ADVICE_COLORS[advice.action]}`}>
                → {advice.action.toUpperCase()}
              </P>
            )}
          </Div>
        )}

        {/* ── Gem Breakdown ── */}
        {analysis && (() => {
          const gemSub = analysis.substats.find(s => s.isGemTarget)
          if (!gemSub) return null
          const suffix = isPercentStat(gemSub.type as StatType) ? '%' : ''
          return (
            <Div className="border-t border-border pt-1.5 space-y-0.5">
              <P className="text-[10px] font-medium text-warning-foreground">
                Gem target: {formatStatLabel(gemSub.type as StatType)} → ?
              </P>
              <Div className="text-[10px] text-muted-foreground space-y-0.5">
                {rune.subStats.map((s, i) => {
                  const sa = analysis.substats[i]
                  if (!sa) return null
                  const isTarget = sa.isGemTarget
                  const powerups = Math.max(0, sa.rolls - 1)
                  const tier = analysis.subStatTiers?.[s.type] as StatTier | undefined
                  return (
                    <P key={i} className={isTarget ? 'text-warning-foreground font-medium' : ''}>
                      {isTarget ? '→ ' : '  '}{formatStatLabel(s.type as StatType)}
                      {tier ? ` [${tier}]` : ''}
                      {` ${s.value}${suffix}`}
                      {powerups > 0 ? ` (${powerups} rolls)` : ' (base)'}
                      {sa.grindable ? ' ⚙' : ''}
                      {isTarget ? ' ← gem' : ''}
                    </P>
                  )
                })}
              </Div>
            </Div>
          )
        })()}

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
