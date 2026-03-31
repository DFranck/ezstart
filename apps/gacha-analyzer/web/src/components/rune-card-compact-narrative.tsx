'use client'

import { Div, P, Span } from '@ezstart/ui/components'
import type {
  RuneData,
  RuneAnalysis,
  RuneQuality,
  ProgressiveAction,
  PlayerProfile,
} from '@gacha-analyzer/types'
import {
  SET_STRENGTH_THRESHOLD_BONUS,
  GRIND_RANGES,
  PROGRESSIVE_SELL_THRESHOLDS,
  SET_STRENGTH,
} from '@gacha-analyzer/types'
import { formatStatLabel, isPercentStat } from './rune-card-compact-substats'

const ADVICE_COLORS: Record<ProgressiveAction, string> = {
  sell: 'text-destructive-foreground',
  upgrade: 'text-ga-roll-rare',
  keep: 'text-success-foreground',
  grind: 'text-ga-roll-hero',
}

interface NarrativeSummaryProps {
  rune: RuneData
  analysis: RuneAnalysis
  quality: RuneQuality
  advice?: RuneAnalysis['progressiveAdvice']
}

export function NarrativeSummary({ rune, analysis, quality, advice }: NarrativeSummaryProps) {
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
  const adjSetWeighted = analysis.adjustedSetWeighted as number | undefined
  const adjPotentialApi = analysis.adjustedPotential as number | undefined
  const currentEff = analysis.setWeightedEfficiency ?? 0
  const effWithPenalties = adjSetWeighted ?? currentEff + penaltiesTotal
  const potentialWithPenalties =
    adjPotentialApi ?? (analysis.potentialEfficiency ?? currentEff) + penaltiesTotal
  const activeProfile = (analysis.profile ?? 'mid') as PlayerProfile
  const activeThresh = (PROGRESSIVE_SELL_THRESHOLDS[activeProfile]?.[levelKey] ?? 0) + setBonus
  const finalThresh = (PROGRESSIVE_SELL_THRESHOLDS[activeProfile]?.[12] ?? 0) + setBonus

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
      negatives.push(
        `Innate ${formatStatLabel(rune.innateStat.type)} ${innateTier}-tier gâchée (devrait être en sub grindable)`
      )
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
  const mainTier = analysis.mainStatTier as string | undefined
  const mainFactor = analysis.mainStatFactor as number | undefined
  if (mainTier && mainFactor !== undefined) {
    if (mainTier === 'S' || mainTier === 'A')
      positives.push(
        `Main stat ${formatStatLabel(rune.mainStat.type)} [${mainTier}] synergique (×${mainFactor})`
      )
    else
      negatives.push(
        `Main stat ${formatStatLabel(rune.mainStat.type)} [${mainTier}] inadaptée (×${mainFactor})`
      )
  }

  // Set strength
  if (setStrengthTier === 'S' || setStrengthTier === 'A')
    positives.push(`Set ${rune.set} (${setStrengthTier}-tier, pas de malus seuil)`)
  else negatives.push(`Set ${rune.set} (${setStrengthTier}-tier, +${setBonus}% sur les seuils)`)

  // High efficiency substats
  analysis.substats.forEach(s => {
    if (s.efficiency >= 95)
      positives.push(`${formatStatLabel(s.type)} parfait (${Math.round(s.efficiency)}%)`)
    else if (
      s.efficiency < 50 &&
      analysis.subStatTiers?.[s.type] &&
      (analysis.subStatTiers[s.type] === 'S' || analysis.subStatTiers[s.type] === 'A')
    )
      negatives.push(`${formatStatLabel(s.type)} à ${Math.round(s.efficiency)}% du max`)
  })

  // Gem recommendation
  if (bestOptim?.gemTarget) {
    infos.push(
      `💎 Gem : ${formatStatLabel(bestOptim.gemTarget.remove)} → ${formatStatLabel(bestOptim.gemTarget.replace)}`
    )
  } else if (bestOptim?.isPerfect) {
    infos.push('💎 Pas besoin de gem — subs parfaites')
  }

  // Grind targets
  const grindableSubs = analysis.substats.filter(s => s.grindable)
  if (grindableSubs.length > 0) {
    infos.push(
      `⚙️ Grind : ${grindableSubs
        .map(s => {
          const range = GRIND_RANGES?.legend?.[s.type]
          const sfx = isPercentStat(s.type) ? '%' : ''
          return range
            ? `${formatStatLabel(s.type)} +${range.min}–${range.max}${sfx}`
            : formatStatLabel(s.type)
        })
        .join(', ')}`
    )
  }

  return (
    <Div className="border-t border-border pt-2 space-y-1.5 text-[11px]">
      <P className={`font-bold text-sm ${ADVICE_COLORS[advice?.action ?? 'sell']}`}>
        {advice?.action === 'sell'
          ? '✗'
          : advice?.action === 'upgrade'
            ? '↑'
            : advice?.action === 'grind'
              ? '⚙'
              : '✓'}{' '}
        Pourquoi {advice?.action?.toUpperCase()} ?
      </P>
      <P className="text-muted-foreground">
        Rune {rune.set} {quality} +{rune.level}
        {rune.isAncient ? ' Ancient' : ''} — Eff. {currentEff}%
        {penaltiesTotal !== 0
          ? ` (${penaltiesTotal > 0 ? '+' : ''}${penaltiesTotal} penalties)`
          : ''}
      </P>
      {positives.length > 0 && (
        <Div className="space-y-0.5">
          {positives.slice(0, 4).map((p, i) => (
            <P key={i} className="text-success-foreground">
              ✓ {p}
            </P>
          ))}
        </Div>
      )}
      {negatives.length > 0 && (
        <Div className="space-y-0.5">
          {negatives.slice(0, 4).map((n, i) => (
            <P key={i} className="text-destructive">
              ✗ {n}
            </P>
          ))}
        </Div>
      )}
      {infos.length > 0 && (
        <Div className="space-y-0.5">
          {infos.map((info, i) => (
            <P key={i} className="text-muted-foreground">
              {info}
            </P>
          ))}
        </Div>
      )}
      <P className="text-muted-foreground font-mono text-[10px]">
        📊 Score ajusté : {Math.round(effWithPenalties * 100) / 100}% | Potentiel ajusté :{' '}
        {Math.round(potentialWithPenalties * 100) / 100}% (seuil final {activeProfile} :{' '}
        {finalThresh}) → {effWithPenalties >= activeThresh ? 'au-dessus' : 'en-dessous'}
      </P>
    </Div>
  )
}
