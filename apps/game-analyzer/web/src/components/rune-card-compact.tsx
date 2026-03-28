'use client'

import { useState } from 'react'
import { Badge, Button, Card, CardContent, Div, P, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, ProgressiveAction, StatTier, PlayerProfile } from '@game-analyzer/types'
import {
  SET_STAT_TIERS, SET_STRENGTH_THRESHOLD_BONUS, SUBSTAT_ROLL_RANGES, ANCIENT_SUBSTAT_BASE_RANGES,
  GRIND_RANGES, GEM_RANGES, TIER_WEIGHTS, PROGRESSIVE_SELL_THRESHOLDS, SET_STRENGTH, GRINDABLE_STATS,
} from '@game-analyzer/types'
import { GEM_ICONS, GRIND_ICONS, RUNE_SET_ICONS } from '../config/game-assets'
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
  const [showDebug, setShowDebug] = useState(false)

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
                  {(() => {
                    const isGem = subAnalysis?.isGemTarget
                    const isGrindable = subAnalysis?.grindable
                    const grindRange = GRIND_RANGES?.legend?.[stat.type]
                    const gemReplaceStat = analysis?.archetypeOptimizations?.[0]?.gemTarget?.replace
                    const gemRange = GEM_RANGES?.legend?.[stat.type]
                    const sfx = isPercentStat(stat.type) ? '%' : ''

                    if (isGem) {
                      // Gem target: gem sprite + set sprite centered overlay
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Div className="relative inline-flex items-center justify-center w-5 h-5 shrink-0 cursor-help">
                                <img src={GEM_ICONS.legend} alt="gem" className="w-5 h-5" />
                                {RUNE_SET_ICONS[rune.set] && (
                                  <img src={RUNE_SET_ICONS[rune.set]} alt={rune.set} className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                                )}
                              </Div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <P className="text-xs">
                                Gem {rune.set}: {formatStatLabel(stat.type)} → {gemReplaceStat ? formatStatLabel(gemReplaceStat) : '?'}
                                {gemRange && ` (${gemRange.min}–${gemRange.max}${sfx})`}
                              </P>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    }
                    if (isGrindable && grindRange) {
                      // Grindable: grind sprite + set sprite centered overlay
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Div className="relative inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 cursor-help">
                                <img src={GRIND_ICONS.legend} alt="grind" className="w-[22px] h-[22px]" />
                                {RUNE_SET_ICONS[rune.set] && (
                                  <img src={RUNE_SET_ICONS[rune.set]} alt={rune.set} className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                                )}
                              </Div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <P className="text-xs">
                                Grind: +{grindRange.min}–{grindRange.max} {formatStatLabel(stat.type)}{sfx}
                              </P>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    }
                    // Non-grindable: grind sprite + ban icon overlay (no set sprite)
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Div className="relative inline-flex items-center justify-center w-[22px] h-[22px] shrink-0 cursor-help opacity-40">
                              <img src={GRIND_ICONS.legend} alt="no grind" className="w-5 h-5" />
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-destructive drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            </Div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <P className="text-xs">Non-grindable</P>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })()}
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

        {/* ── Narrative Summary — always visible ── */}
        {analysis && (() => {
          const qualityPen = analysis.qualityPenalty ?? 0
          const innate = analysis.innateScore ?? 0
          const innateTier = analysis.innateTier
          const lowRoll = analysis.lowRollPenalty ?? 0
          const nonGrind = analysis.nonGrindablePenalty ?? 0
          const mismatchPen = analysis.mismatchPenalty ?? 0
          const setStrengthTier = (analysis.setStrength ?? SET_STRENGTH[rune.set] ?? 'C') as string
          const setBonus = SET_STRENGTH_THRESHOLD_BONUS[setStrengthTier] ?? 0
          const penaltiesTotal = qualityPen + innate + mismatchPen + lowRoll + nonGrind
          const bestOptim = analysis.archetypeOptimizations?.[0]
          const levelKey = Math.min(Math.floor(rune.level / 3) * 3, 12) as 0 | 3 | 6 | 9 | 12
          const currentEff = analysis.setWeightedEfficiency ?? 0
          const potentialEff = analysis.potentialEfficiency ?? currentEff
          const effWithPenalties = currentEff + penaltiesTotal
          const activeProfile = ((analysis as any).profile ?? 'mid') as PlayerProfile
          const activeThresh = (PROGRESSIVE_SELL_THRESHOLDS[activeProfile]?.[levelKey] ?? 0) + setBonus

          // Build positive/negative points
          const positives: string[] = []
          const negatives: string[] = []
          const infos: string[] = []

          // Quality
          if (quality === 'legend') positives.push('Qualité Legend (pas de malus)')
          else negatives.push(`Qualité ${quality} (${qualityPen} sur le score)`)

          // Innate
          if (rune.innateStat && innateTier) {
            if (innateTier === 'S' || innateTier === 'A')
              negatives.push(`Innate ${formatStatLabel(rune.innateStat.type)} ${innateTier}-tier gâchée (devrait être en sub grindable)`)
            else if (innateTier === 'B' || innateTier === 'C')
              positives.push(`Innate ${formatStatLabel(rune.innateStat.type)} ${innateTier}-tier correcte`)
          }

          // Low-roll
          if (lowRoll < 0) negatives.push(`Rolls faibles sur stats S/A-tier (${lowRoll})`)
          else positives.push('Rolls corrects sur les stats importantes')

          // Non-grindable
          if (nonGrind < 0) {
            const ngCount = analysis.substats.filter(s => !s.grindable).length
            negatives.push(`${ngCount} stats non-grindables (${nonGrind})`)
          } else {
            positives.push('Stats grindables')
          }

          // Mismatch
          if (mismatchPen < 0) negatives.push(`Stats hors-profil du set (${mismatchPen})`)
          else positives.push('Stats synergiques avec le set')

          // Main stat tier (slots 2/4/6 only)
          const mainTier = (analysis as any).mainStatTier as string | undefined
          const mainFactor = (analysis as any).mainStatFactor as number | undefined
          if (mainTier && mainFactor !== undefined) {
            if (mainTier === 'S' || mainTier === 'A')
              positives.push(`Main stat ${formatStatLabel(rune.mainStat.type)} [${mainTier}] synergique (×${mainFactor})`)
            else
              negatives.push(`Main stat ${formatStatLabel(rune.mainStat.type)} [${mainTier}] inadaptée (×${mainFactor})`)
          }

          // Set strength
          if (setStrengthTier === 'S' || setStrengthTier === 'A')
            positives.push(`Set ${rune.set} (${setStrengthTier}-tier, pas de malus seuil)`)
          else
            negatives.push(`Set ${rune.set} (${setStrengthTier}-tier, +${setBonus}% sur les seuils)`)

          // High efficiency substats
          analysis.substats.forEach(s => {
            if (s.efficiency >= 95) positives.push(`${formatStatLabel(s.type)} parfait (${Math.round(s.efficiency)}%)`)
            else if (s.efficiency < 50 && analysis.subStatTiers?.[s.type] && (analysis.subStatTiers[s.type] === 'S' || analysis.subStatTiers[s.type] === 'A'))
              negatives.push(`${formatStatLabel(s.type)} à ${Math.round(s.efficiency)}% du max`)
          })

          // Gem recommendation
          if (bestOptim?.gemTarget) {
            infos.push(`💎 Gem : ${formatStatLabel(bestOptim.gemTarget.remove)} → ${formatStatLabel(bestOptim.gemTarget.replace)}`)
          } else if (bestOptim?.isPerfect) {
            infos.push('💎 Pas besoin de gem — subs parfaites')
          }

          // Grind targets
          const grindableSubs = analysis.substats.filter(s => s.grindable)
          if (grindableSubs.length > 0) {
            infos.push(`⚙️ Grind : ${grindableSubs.map(s => {
              const range = GRIND_RANGES?.legend?.[s.type]
              const sfx = isPercentStat(s.type) ? '%' : ''
              return range ? `${formatStatLabel(s.type)} +${range.min}–${range.max}${sfx}` : formatStatLabel(s.type)
            }).join(', ')}`)
          }

          return (
            <Div className="border-t border-border pt-2 space-y-1.5 text-[11px]">
              <P className={`font-bold text-sm ${ADVICE_COLORS[advice?.action ?? 'sell']}`}>
                {advice?.action === 'sell' ? '✗' : advice?.action === 'upgrade' ? '↑' : advice?.action === 'grind' ? '⚙' : '✓'} Pourquoi {advice?.action?.toUpperCase()} ?
              </P>
              <P className="text-muted-foreground">
                Rune {rune.set} {quality} +{rune.level}{rune.isAncient ? ' Ancient' : ''} — Eff. {currentEff}%{penaltiesTotal !== 0 ? ` (${penaltiesTotal > 0 ? '+' : ''}${penaltiesTotal} penalties)` : ''}
              </P>
              {positives.length > 0 && (
                <Div className="space-y-0.5">
                  {positives.slice(0, 4).map((p, i) => (
                    <P key={i} className="text-success-foreground">✓ {p}</P>
                  ))}
                </Div>
              )}
              {negatives.length > 0 && (
                <Div className="space-y-0.5">
                  {negatives.slice(0, 4).map((n, i) => (
                    <P key={i} className="text-destructive">✗ {n}</P>
                  ))}
                </Div>
              )}
              {infos.length > 0 && (
                <Div className="space-y-0.5">
                  {infos.map((info, i) => (
                    <P key={i} className="text-muted-foreground">{info}</P>
                  ))}
                </Div>
              )}
              <P className="text-muted-foreground font-mono text-[10px]">
                📊 Score : {currentEff}% {penaltiesTotal !== 0 ? `${penaltiesTotal > 0 ? '+' : ''}${penaltiesTotal}` : ''} = {Math.round(effWithPenalties * 100) / 100} | Seuil {activeProfile} +{levelKey} : {activeThresh} → {effWithPenalties >= activeThresh ? 'au-dessus' : 'en-dessous'}
              </P>
            </Div>
          )
        })()}

        {/* ── Debug Panel (expandable) ── */}
        {analysis && (
          <Div className="space-y-1">
            <Button variant="ghost" size="sm" className="text-[9px] text-muted-foreground/50 h-auto py-0.5 px-1" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? '\u25BC Hide debug' : '\u25B6 Debug'}
            </Button>
            {showDebug && (() => {
              const breakdown = (analysis as any).setWeightedBreakdown as Array<{
                type: StatType; value: number; rolls: number; maxPossible: number;
                ratio: number; tier: StatTier; tierWeight: number; grindBonus: number; contribution: number
              }> | undefined
              const maxDivisor = (analysis as any).setWeightedMaxDivisor as number | undefined
              const setTiers = SET_STAT_TIERS[rune.set]
              const setStrengthTier = (analysis.setStrength ?? SET_STRENGTH[rune.set] ?? 'C') as string
              const setBonus = SET_STRENGTH_THRESHOLD_BONUS[setStrengthTier] ?? 0

              // Compute penalties total
              const qualityPen = analysis.qualityPenalty ?? 0
              const innate = analysis.innateScore ?? 0
              const mismatchPen = analysis.mismatchPenalty ?? 0
              const lowRoll = analysis.lowRollPenalty ?? 0
              const nonGrind = analysis.nonGrindablePenalty ?? 0
              const penaltiesTotal = qualityPen + innate + mismatchPen + lowRoll + nonGrind

              // Gem analysis from archetypeOptimizations
              const bestOptim = analysis.archetypeOptimizations?.[0]

              return (
                <Div className="bg-muted/10 border border-border rounded p-2 space-y-2 font-mono text-[9px] leading-tight">

                  {/* ── Section 1: Rune Info ── */}
                  <Div className="space-y-0.5">
                    <P className="font-bold text-[10px] text-foreground">Rune Info</P>
                    <P className="text-muted-foreground">Set: {rune.set} ({setStrengthTier}-tier, +{setBonus}% seuils)</P>
                    <P className="text-muted-foreground">Slot: {rune.slot} | Level: +{rune.level} | Quality: {quality} | Ancient: {rune.isAncient ? 'yes' : 'no'}</P>
                    <P className="text-muted-foreground">Main stat: {formatStatLabel(rune.mainStat.type)} {formatStatValue(rune.mainStat.type, rune.mainStat.value)}</P>
                    {rune.innateStat && (
                      <P className="text-muted-foreground">
                        Innate: {formatStatLabel(rune.innateStat.type)} {formatStatValue(rune.innateStat.type, rune.innateStat.value)} [{analysis.innateTier ?? getStatTier(rune.set, rune.innateStat.type)}-tier] → score: <span className={(analysis.innateScore ?? 0) > 0 ? 'text-success-foreground' : (analysis.innateScore ?? 0) < 0 ? 'text-destructive' : ''}>{analysis.innateScore !== undefined ? (analysis.innateScore > 0 ? '+' : '') + analysis.innateScore : '0'}</span>
                      </P>
                    )}
                    <P className="text-muted-foreground">Substats: {rune.subStats.length}/4</P>
                  </Div>

                  {/* ── Section 2: Set-Weighted Efficiency Breakdown ── */}
                  {breakdown && maxDivisor && (
                    <Div className="space-y-0.5">
                      <P className="font-bold text-[10px] text-foreground">Set-Weighted Efficiency Breakdown</P>
                      {breakdown.map((item, idx) => {
                        const sfx = isPercentStat(item.type) ? '%' : ''
                        const tierColor = item.tier === 'S' || item.tier === 'A' ? 'text-success-foreground' : item.tier === 'C' || item.tier === 'D' ? 'text-destructive' : 'text-muted-foreground'
                        const grindColor = item.grindBonus > 1 ? 'text-success-foreground' : 'text-destructive'
                        const contribColor = item.contribution > 0.8 ? 'text-success-foreground' : item.contribution < 0.3 ? 'text-destructive' : 'text-muted-foreground'
                        return (
                          <Div key={idx} className="space-y-0.5 pl-1">
                            <P className="text-muted-foreground">
                              {formatStatLabel(item.type)} [<span className={tierColor}>{item.tier}</span>]: value={item.value}{sfx}, rolls={item.rolls}, maxPossible={item.maxPossible}{sfx}
                            </P>
                            <P className="text-muted-foreground/60 pl-2">
                              ratio = ({item.value}/{item.maxPossible}) x {item.rolls} = {item.ratio}
                            </P>
                            <P className="text-muted-foreground/60 pl-2">
                              x tierWeight({item.tier}) = <span className={tierColor}>{item.tierWeight}</span>
                            </P>
                            <P className="text-muted-foreground/60 pl-2">
                              x grindBonus = <span className={grindColor}>{item.grindBonus}</span> {item.grindBonus > 1 ? '(grindable)' : '(non-grindable)'}
                            </P>
                            <P className={`pl-2 ${contribColor}`}>
                              = contribution: {item.contribution}
                            </P>
                          </Div>
                        )
                      })}
                      <Div className="border-t border-dashed border-border/30 mt-1 pt-1 pl-1 space-y-0.5">
                        <P className="text-muted-foreground">
                          Total weighted sum: {Math.round(breakdown.reduce((s, b) => s + b.contribution, 0) * 100) / 100}
                        </P>
                        <P className="text-muted-foreground">
                          Max divisor: TOTAL_EVENTS[{quality}] x 1.0 x 1.2 = {maxDivisor}
                        </P>
                        <P className="text-foreground font-medium">
                          Set Eff = {Math.round(breakdown.reduce((s, b) => s + b.contribution, 0) * 100) / 100} / {maxDivisor} x 100 = {analysis.setWeightedEfficiency}%
                        </P>
                      </Div>
                    </Div>
                  )}

                  {/* ── Section 3: Penalties ── */}
                  <Div className="space-y-0.5">
                    <P className="font-bold text-[10px] text-foreground">Penalties</P>
                    <P className={qualityPen < 0 ? 'text-destructive' : 'text-success-foreground'}>Quality: {quality} = <span className="font-bold">{qualityPen === 0 ? '✓ 0' : qualityPen}</span></P>
                    <P className={innate < 0 ? 'text-destructive' : 'text-success-foreground'}>
                      Innate: {rune.innateStat ? `${formatStatLabel(rune.innateStat.type)} [${analysis.innateTier ?? '?'}]` : 'none'} = <span className="font-bold">{innate === 0 ? '✓ 0' : (innate > 0 ? '+' : '') + innate}</span>
                    </P>
                    <P className={lowRoll < 0 ? 'text-destructive' : 'text-success-foreground'}>Low-roll: <span className="font-bold">{lowRoll === 0 ? '✓ 0' : lowRoll}</span></P>
                    <P className={nonGrind < 0 ? 'text-destructive' : 'text-success-foreground'}>Non-grindable: <span className="font-bold">{nonGrind === 0 ? '✓ 0' : nonGrind}</span></P>
                    <P className={mismatchPen < 0 ? 'text-destructive' : 'text-success-foreground'}>Mismatch: <span className="font-bold">{mismatchPen === 0 ? '✓ 0' : mismatchPen}</span></P>
                    <P className={setStrengthTier === 'S' || setStrengthTier === 'A' ? 'text-success-foreground' : setStrengthTier === 'D' || setStrengthTier === 'C' ? 'text-destructive' : 'text-muted-foreground'}>Set: {rune.set} (<span className="font-bold">{setStrengthTier}</span>) → <span className="font-bold">+{setBonus}%</span> seuils</P>
                    <P className={`font-medium ${penaltiesTotal > 0 ? 'text-success-foreground' : penaltiesTotal < 0 ? 'text-destructive' : 'text-success-foreground'}`}>Total: <span className="font-bold">{penaltiesTotal === 0 ? '✓ 0' : (penaltiesTotal > 0 ? '+' : '') + penaltiesTotal}</span></P>
                  </Div>

                  {/* ── Section 4: Progressive Advice (all 3 profiles) ── */}
                  <Div className="space-y-0.5">
                    <P className="font-bold text-[10px] text-foreground">Progressive Advice (all profiles)</P>
                    {(() => {
                      const profiles: PlayerProfile[] = ['early', 'mid', 'late']
                      const levelKey = Math.min(Math.floor(rune.level / 3) * 3, 12) as 0 | 3 | 6 | 9 | 12
                      const currentEff = analysis.setWeightedEfficiency ?? 0
                      const potentialEff = analysis.potentialEfficiency ?? currentEff
                      const effWithPenalties = currentEff + penaltiesTotal
                      const potentialWithPenalties = potentialEff + penaltiesTotal

                      return (
                        <Div className="overflow-x-auto">
                          <table className="w-full text-[9px]">
                            <thead>
                              <tr className="text-muted-foreground/60">
                                <td className="pr-2"></td>
                                {profiles.map(p => <td key={p} className="text-center px-1 font-medium">{p.toUpperCase()}</td>)}
                              </tr>
                            </thead>
                            <tbody className="text-muted-foreground">
                              <tr>
                                <td className="pr-2">Threshold +{levelKey}:</td>
                                {profiles.map(p => <td key={p} className="text-center px-1">{PROGRESSIVE_SELL_THRESHOLDS[p][levelKey] ?? '?'}</td>)}
                              </tr>
                              <tr>
                                <td className="pr-2">+ set strength:</td>
                                {profiles.map(p => <td key={p} className="text-center px-1">{(PROGRESSIVE_SELL_THRESHOLDS[p][levelKey] ?? 0) + setBonus}</td>)}
                              </tr>
                              <tr>
                                <td className="pr-2">Current eff:</td>
                                {profiles.map(p => <td key={p} className="text-center px-1">{currentEff}</td>)}
                              </tr>
                              <tr>
                                <td className="pr-2">+ penalties:</td>
                                {profiles.map(p => <td key={p} className="text-center px-1">{Math.round(effWithPenalties * 100) / 100}</td>)}
                              </tr>
                              {rune.level < 12 && (
                                <>
                                  <tr>
                                    <td className="pr-2">Potential +12:</td>
                                    {profiles.map(p => <td key={p} className="text-center px-1">{potentialEff}</td>)}
                                  </tr>
                                  <tr>
                                    <td className="pr-2">+ penalties:</td>
                                    {profiles.map(p => <td key={p} className="text-center px-1">{Math.round(potentialWithPenalties * 100) / 100}</td>)}
                                  </tr>
                                </>
                              )}
                              <tr>
                                <td className="pr-2">vs final thresh:</td>
                                {profiles.map(p => <td key={p} className="text-center px-1">{(PROGRESSIVE_SELL_THRESHOLDS[p][12] ?? 0) + setBonus}</td>)}
                              </tr>
                              <tr className="font-bold">
                                <td className="pr-2">→ Decision:</td>
                                {profiles.map(p => {
                                  const thresh = (PROGRESSIVE_SELL_THRESHOLDS[p][levelKey] ?? 0) + setBonus
                                  const finalThresh = (PROGRESSIVE_SELL_THRESHOLDS[p][12] ?? 0) + setBonus
                                  const adjCurrent = effWithPenalties
                                  const adjPotential = potentialWithPenalties
                                  let decision: string
                                  if (rune.level >= 12) {
                                    decision = adjCurrent >= thresh ? 'KEEP/GRIND' : 'SELL'
                                  } else if (adjPotential >= finalThresh) {
                                    decision = 'UPGRADE'
                                  } else if (adjCurrent < thresh) {
                                    decision = 'SELL'
                                  } else {
                                    decision = 'UPGRADE'
                                  }
                                  const color = decision === 'SELL' ? 'text-destructive' : decision === 'UPGRADE' ? 'text-ga-roll-rare' : 'text-success-foreground'
                                  return <td key={p} className={`text-center px-1 ${color}`}>{decision}</td>
                                })}
                              </tr>
                              <tr>
                                <td className="pr-2">Sell prob:</td>
                                {profiles.map(p => {
                                  const finalThresh = (PROGRESSIVE_SELL_THRESHOLDS[p][12] ?? 0) + setBonus
                                  const adjPotential = potentialWithPenalties
                                  const prob = Math.min(95, Math.max(5, Math.round((1 - adjPotential / finalThresh) * 100)))
                                  return <td key={p} className="text-center px-1">{prob}%</td>
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </Div>
                      )
                    })()}
                  </Div>

                  {/* ── Section 5: Gem Analysis ── */}
                  {bestOptim && (
                    <Div className="space-y-0.5">
                      <P className="font-bold text-[10px] text-foreground">Gem Analysis</P>
                      {bestOptim.gemTarget ? (
                        <>
                          <P className="text-muted-foreground">Gem target: {formatStatLabel(bestOptim.gemTarget.remove)}</P>
                          <P className="text-muted-foreground/60 pl-2">Reason: {bestOptim.gemTarget.reason}</P>
                          {rune.subStats.map((sub, idx) => {
                            const tier = getStatTier(rune.set, sub.type)
                            const tierW = TIER_WEIGHTS[tier] ?? 0
                            const isGrindable = GRINDABLE_STATS.includes(sub.type)
                            const grindBonus = isGrindable ? 0.3 : 0
                            const subAnalysis = analysis.substats.find(s => s.type === sub.type)
                            const powerupRolls = subAnalysis?.rollBreakdown ? subAnalysis.rollBreakdown.length - 1 : 0
                            const rollBonus = powerupRolls * 0.4
                            const total = Math.round((tierW + grindBonus + rollBonus) * 100) / 100
                            const isTarget = sub.type === bestOptim.gemTarget?.remove
                            return (
                              <P key={idx} className={`text-muted-foreground/60 pl-2 ${isTarget ? 'text-destructive font-medium' : ''}`}>
                                {formatStatLabel(sub.type)}: tier={tier}({tierW}) + {isGrindable ? `grindable(${grindBonus})` : `non-grind(0)`} + {powerupRolls} rolls({rollBonus}) = {total}{isTarget ? ' <-- LOWEST' : ''}
                              </P>
                            )
                          })}
                          <P className="text-foreground font-medium pl-2">
                            → Gem {formatStatLabel(bestOptim.gemTarget.remove)} → {formatStatLabel(bestOptim.gemTarget.replace)}
                          </P>
                          <P className="text-muted-foreground/60 pl-2">
                            Rolls lost: {bestOptim.rollsLost} | Post-optim score: {bestOptim.postOptimScore}
                          </P>
                        </>
                      ) : (
                        <P className="text-success-foreground">No gem needed — all substats match archetype ({bestOptim.archetype})</P>
                      )}
                    </Div>
                  )}

                  {/* ── Section 6: Constants used ── */}
                  <Div className="space-y-0.5">
                    <P className="font-bold text-[10px] text-foreground">Constants</P>
                    {setTiers && (
                      <Div className="space-y-0.5">
                        <P className="text-muted-foreground">SET_STAT_TIERS[{rune.set}]:</P>
                        <P className="text-muted-foreground/60 pl-2">
                          {Object.entries(setTiers).filter(([, t]) => t !== 'C' && t !== 'D').map(([stat, tier]) => `${formatStatLabel(stat as StatType)}=${tier}`).join(' ')}
                        </P>
                      </Div>
                    )}
                    <Div className="space-y-0.5">
                      <P className="text-muted-foreground">TIER_WEIGHTS: {Object.entries(TIER_WEIGHTS).map(([k, v]) => `${k}=${v}`).join(' ')}</P>
                    </Div>
                    <Div className="space-y-0.5">
                      <P className="text-muted-foreground">PROGRESSIVE_SELL_THRESHOLDS:</P>
                      {(['early', 'mid', 'late'] as PlayerProfile[]).map(p => (
                        <P key={p} className="text-muted-foreground/60 pl-2">
                          {p}: {JSON.stringify(PROGRESSIVE_SELL_THRESHOLDS[p])}
                        </P>
                      ))}
                    </Div>
                  </Div>
                </Div>
              )
            })()}
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
