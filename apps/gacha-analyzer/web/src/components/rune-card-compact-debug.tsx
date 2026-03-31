'use client'

import { Div, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type {
  RuneData,
  RuneAnalysis,
  StatType,
  RuneQuality,
  StatTier,
  PlayerProfile,
} from '@gacha-analyzer/types'
import {
  SET_STAT_TIERS,
  TIER_WEIGHTS,
  PROGRESSIVE_SELL_THRESHOLDS,
  SET_STRENGTH,
  SET_STRENGTH_THRESHOLD_BONUS,
  GRINDABLE_STATS,
} from '@gacha-analyzer/types'
import { formatStatLabel, isPercentStat, getStatTier } from './rune-card-compact-substats'

interface DebugPanelProps {
  rune: RuneData
  analysis: RuneAnalysis
  quality: RuneQuality
}

export function DebugPanel({ rune, analysis, quality }: DebugPanelProps) {
  const tRune = useTranslations('rune')

  const breakdown = analysis.setWeightedBreakdown as
    | Array<{
        type: StatType
        value: number
        rolls: number
        maxPossible: number
        ratio: number
        tier: StatTier
        tierWeight: number
        grindBonus: number
        contribution: number
      }>
    | undefined
  const maxDivisor = analysis.setWeightedMaxDivisor as number | undefined
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
      {/* Section 1: Rune Info */}
      <RuneInfoSection
        rune={rune}
        analysis={analysis}
        quality={quality}
        setStrengthTier={setStrengthTier}
        setBonus={setBonus}
        tRune={tRune}
      />

      {/* Section 2: Set-Weighted Efficiency Breakdown */}
      {breakdown && maxDivisor && (
        <EfficiencyBreakdownSection
          breakdown={breakdown}
          maxDivisor={maxDivisor}
          quality={quality}
          setWeightedEfficiency={analysis.setWeightedEfficiency}
        />
      )}

      {/* Section 3: Penalties */}
      <PenaltiesSection
        rune={rune}
        analysis={analysis}
        quality={quality}
        qualityPen={qualityPen}
        innate={innate}
        mismatchPen={mismatchPen}
        lowRoll={lowRoll}
        nonGrind={nonGrind}
        penaltiesTotal={penaltiesTotal}
        setStrengthTier={setStrengthTier}
        setBonus={setBonus}
        tRune={tRune}
      />

      {/* Section 4: Progressive Advice */}
      <ProgressiveAdviceSection
        rune={rune}
        analysis={analysis}
        penaltiesTotal={penaltiesTotal}
        setBonus={setBonus}
      />

      {/* Section 5: Gem Analysis */}
      {bestOptim && (
        <GemAnalysisSection rune={rune} analysis={analysis} bestOptim={bestOptim} tRune={tRune} />
      )}

      {/* Section 6: Constants */}
      <ConstantsSection rune={rune} setTiers={setTiers} />
    </Div>
  )
}

function RuneInfoSection({
  rune,
  analysis,
  quality,
  setStrengthTier,
  setBonus,
  tRune,
}: {
  rune: RuneData
  analysis: RuneAnalysis
  quality: RuneQuality
  setStrengthTier: string
  setBonus: number
  tRune: ReturnType<typeof useTranslations>
}) {
  return (
    <Div className="space-y-0.5">
      <P className="font-bold text-[10px] text-foreground">{tRune('runeInfo')}</P>
      <P className="text-muted-foreground">
        Set: {rune.set} ({setStrengthTier}-tier, +{setBonus}% seuils)
      </P>
      <P className="text-muted-foreground">
        Slot: {rune.slot} | Level: +{rune.level} | Quality: {quality} | Ancient:{' '}
        {rune.isAncient ? 'yes' : 'no'}
      </P>
      <P className="text-muted-foreground">
        Main stat: {formatStatLabel(rune.mainStat.type)}{' '}
        {isPercentStat(rune.mainStat.type) ? `+${rune.mainStat.value}%` : `+${rune.mainStat.value}`}
      </P>
      {rune.innateStat && (
        <P className="text-muted-foreground">
          Innate: {formatStatLabel(rune.innateStat.type)}{' '}
          {isPercentStat(rune.innateStat.type)
            ? `+${rune.innateStat.value}%`
            : `+${rune.innateStat.value}`}{' '}
          [{analysis.innateTier ?? getStatTier(rune.set, rune.innateStat.type)}-tier] → score:{' '}
          <Span
            className={
              (analysis.innateScore ?? 0) > 0
                ? 'text-success-foreground'
                : (analysis.innateScore ?? 0) < 0
                  ? 'text-destructive'
                  : ''
            }
          >
            {analysis.innateScore !== undefined
              ? (analysis.innateScore > 0 ? '+' : '') + analysis.innateScore
              : '0'}
          </Span>
        </P>
      )}
      <P className="text-muted-foreground">Substats: {rune.subStats.length}/4</P>
    </Div>
  )
}

function EfficiencyBreakdownSection({
  breakdown,
  maxDivisor,
  quality,
  setWeightedEfficiency,
}: {
  breakdown: Array<{
    type: StatType
    value: number
    rolls: number
    maxPossible: number
    ratio: number
    tier: StatTier
    tierWeight: number
    grindBonus: number
    contribution: number
  }>
  maxDivisor: number
  quality: RuneQuality
  setWeightedEfficiency?: number
}) {
  return (
    <Div className="space-y-0.5">
      <P className="font-bold text-[10px] text-foreground">Set-Weighted Efficiency Breakdown</P>
      {breakdown.map((item, idx) => {
        const sfx = isPercentStat(item.type) ? '%' : ''
        const tierColor =
          item.tier === 'S' || item.tier === 'A'
            ? 'text-success-foreground'
            : item.tier === 'C' || item.tier === 'D'
              ? 'text-destructive'
              : 'text-muted-foreground'
        const grindColor = item.grindBonus > 1 ? 'text-success-foreground' : 'text-destructive'
        const contribColor =
          item.contribution > 0.8
            ? 'text-success-foreground'
            : item.contribution < 0.3
              ? 'text-destructive'
              : 'text-muted-foreground'
        return (
          <Div key={idx} className="space-y-0.5 pl-1">
            <P className="text-muted-foreground">
              {formatStatLabel(item.type)} [<Span className={tierColor}>{item.tier}</Span>]: value=
              {item.value}
              {sfx}, rolls={item.rolls}, maxPossible={item.maxPossible}
              {sfx}
            </P>
            <P className="text-muted-foreground/60 pl-2">
              ratio = ({item.value}/{item.maxPossible}) x {item.rolls} = {item.ratio}
            </P>
            <P className="text-muted-foreground/60 pl-2">
              x tierWeight({item.tier}) = <Span className={tierColor}>{item.tierWeight}</Span>
            </P>
            <P className="text-muted-foreground/60 pl-2">
              x grindBonus = <Span className={grindColor}>{item.grindBonus}</Span>{' '}
              {item.grindBonus > 1 ? '(grindable)' : '(non-grindable)'}
            </P>
            <P className={`pl-2 ${contribColor}`}>= contribution: {item.contribution}</P>
          </Div>
        )
      })}
      <Div className="border-t border-dashed border-border/30 mt-1 pt-1 pl-1 space-y-0.5">
        <P className="text-muted-foreground">
          Total weighted sum:{' '}
          {Math.round(breakdown.reduce((s, b) => s + b.contribution, 0) * 100) / 100}
        </P>
        <P className="text-muted-foreground">
          Max divisor: TOTAL_EVENTS[{quality}] x 1.0 x 1.2 = {maxDivisor}
        </P>
        <P className="text-foreground font-medium">
          Set Eff = {Math.round(breakdown.reduce((s, b) => s + b.contribution, 0) * 100) / 100} /{' '}
          {maxDivisor} x 100 = {setWeightedEfficiency}%
        </P>
      </Div>
    </Div>
  )
}

function PenaltiesSection({
  rune,
  analysis,
  quality,
  qualityPen,
  innate,
  mismatchPen,
  lowRoll,
  nonGrind,
  penaltiesTotal,
  setStrengthTier,
  setBonus,
  tRune,
}: {
  rune: RuneData
  analysis: RuneAnalysis
  quality: RuneQuality
  qualityPen: number
  innate: number
  mismatchPen: number
  lowRoll: number
  nonGrind: number
  penaltiesTotal: number
  setStrengthTier: string
  setBonus: number
  tRune: ReturnType<typeof useTranslations>
}) {
  return (
    <Div className="space-y-0.5">
      <P className="font-bold text-[10px] text-foreground">{tRune('penalties')}</P>
      <P className={qualityPen < 0 ? 'text-destructive' : 'text-success-foreground'}>
        Quality: {quality} ={' '}
        <Span className="font-bold">{qualityPen === 0 ? '✓ 0' : qualityPen}</Span>
      </P>
      <P className={innate < 0 ? 'text-destructive' : 'text-success-foreground'}>
        Innate:{' '}
        {rune.innateStat
          ? `${formatStatLabel(rune.innateStat.type)} [${analysis.innateTier ?? '?'}]`
          : 'none'}{' '}
        ={' '}
        <Span className="font-bold">{innate === 0 ? '✓ 0' : (innate > 0 ? '+' : '') + innate}</Span>
      </P>
      <P className={lowRoll < 0 ? 'text-destructive' : 'text-success-foreground'}>
        Low-roll: <Span className="font-bold">{lowRoll === 0 ? '✓ 0' : lowRoll}</Span>
      </P>
      <P className={nonGrind < 0 ? 'text-destructive' : 'text-success-foreground'}>
        Non-grindable: <Span className="font-bold">{nonGrind === 0 ? '✓ 0' : nonGrind}</Span>
      </P>
      <P className={mismatchPen < 0 ? 'text-destructive' : 'text-success-foreground'}>
        Mismatch: <Span className="font-bold">{mismatchPen === 0 ? '✓ 0' : mismatchPen}</Span>
      </P>
      <P
        className={
          setStrengthTier === 'S' || setStrengthTier === 'A'
            ? 'text-success-foreground'
            : setStrengthTier === 'D' || setStrengthTier === 'C'
              ? 'text-destructive'
              : 'text-muted-foreground'
        }
      >
        Set: {rune.set} (<Span className="font-bold">{setStrengthTier}</Span>) →{' '}
        <Span className="font-bold">+{setBonus}%</Span> seuils
      </P>
      <P
        className={`font-medium ${penaltiesTotal > 0 ? 'text-success-foreground' : penaltiesTotal < 0 ? 'text-destructive' : 'text-success-foreground'}`}
      >
        Total:{' '}
        <Span className="font-bold">
          {penaltiesTotal === 0 ? '✓ 0' : (penaltiesTotal > 0 ? '+' : '') + penaltiesTotal}
        </Span>
      </P>
    </Div>
  )
}

function ProgressiveAdviceSection({
  rune,
  analysis,
  penaltiesTotal,
  setBonus,
}: {
  rune: RuneData
  analysis: RuneAnalysis
  penaltiesTotal: number
  setBonus: number
}) {
  const profiles: PlayerProfile[] = ['early', 'mid', 'late']
  const levelKey = Math.min(Math.floor(rune.level / 3) * 3, 12) as 0 | 3 | 6 | 9 | 12
  const adjSetWeighted = analysis.adjustedSetWeighted as number | undefined
  const adjPotentialApi = analysis.adjustedPotential as number | undefined
  const activeProfileKey = (analysis.profile ?? 'mid') as PlayerProfile
  const currentEff = analysis.setWeightedEfficiency ?? 0
  const effWithPenalties = adjSetWeighted ?? currentEff + penaltiesTotal
  const potentialWithPenalties =
    adjPotentialApi ?? (analysis.potentialEfficiency ?? currentEff) + penaltiesTotal

  return (
    <Div className="space-y-0.5">
      <P className="font-bold text-[10px] text-foreground">Progressive Advice (all profiles)</P>
      <Div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-muted-foreground/60">
              <td className="pr-2"></td>
              {profiles.map(p => (
                <td key={p} className="text-center px-1 font-medium">
                  {p.toUpperCase()}
                </td>
              ))}
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr>
              <td className="pr-2">Threshold +{levelKey}:</td>
              {profiles.map(p => (
                <td key={p} className="text-center px-1">
                  {PROGRESSIVE_SELL_THRESHOLDS[p][levelKey] ?? '?'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="pr-2">+ set strength:</td>
              {profiles.map(p => (
                <td key={p} className="text-center px-1">
                  {(PROGRESSIVE_SELL_THRESHOLDS[p][levelKey] ?? 0) + setBonus}
                </td>
              ))}
            </tr>
            <tr>
              <td className="pr-2">Adjusted score:</td>
              {profiles.map(p => (
                <td key={p} className="text-center px-1">
                  {Math.round(effWithPenalties * 100) / 100}
                  {p !== activeProfileKey ? '*' : ''}
                </td>
              ))}
            </tr>
            {rune.level < 12 && (
              <tr>
                <td className="pr-2">Adjusted potential:</td>
                {profiles.map(p => (
                  <td key={p} className="text-center px-1">
                    {Math.round(potentialWithPenalties * 100) / 100}
                    {p !== activeProfileKey ? '*' : ''}
                  </td>
                ))}
              </tr>
            )}
            <tr>
              <td className="pr-2">vs final thresh:</td>
              {profiles.map(p => (
                <td key={p} className="text-center px-1">
                  {(PROGRESSIVE_SELL_THRESHOLDS[p][12] ?? 0) + setBonus}
                </td>
              ))}
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
                const color =
                  decision === 'SELL'
                    ? 'text-destructive'
                    : decision === 'UPGRADE'
                      ? 'text-ga-roll-rare'
                      : 'text-success-foreground'
                return (
                  <td key={p} className={`text-center px-1 ${color}`}>
                    {decision}
                  </td>
                )
              })}
            </tr>
            <tr>
              <td className="pr-2">Sell prob:</td>
              {profiles.map(p => {
                const finalThresh = (PROGRESSIVE_SELL_THRESHOLDS[p][12] ?? 0) + setBonus
                const adjPotential = potentialWithPenalties
                const prob = Math.min(
                  95,
                  Math.max(5, Math.round((1 - adjPotential / finalThresh) * 100))
                )
                return (
                  <td key={p} className="text-center px-1">
                    {prob}%
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
        <P className="text-muted-foreground/40 text-[8px] mt-1">
          * approximation (seul le profil {activeProfileKey} est exact)
        </P>
      </Div>
    </Div>
  )
}

function GemAnalysisSection({
  rune,
  analysis,
  bestOptim,
  tRune,
}: {
  rune: RuneData
  analysis: RuneAnalysis
  bestOptim: NonNullable<RuneAnalysis['archetypeOptimizations']>[number]
  tRune: ReturnType<typeof useTranslations>
}) {
  return (
    <Div className="space-y-0.5">
      <P className="font-bold text-[10px] text-foreground">{tRune('gemAnalysis')}</P>
      {bestOptim.gemTarget ? (
        <>
          <P className="text-muted-foreground">
            Gem target: {formatStatLabel(bestOptim.gemTarget.remove)}
          </P>
          <P className="text-muted-foreground/60 pl-2">Reason: {bestOptim.gemTarget.reason}</P>
          {rune.subStats.map((sub, idx) => {
            const tier = getStatTier(rune.set, sub.type)
            const tierW = TIER_WEIGHTS[tier] ?? 0
            const isGrindable = GRINDABLE_STATS.includes(sub.type)
            const grindBonus = isGrindable ? 0.3 : 0
            const subAnalysis = analysis.substats.find(s => s.type === sub.type)
            const powerupRolls = subAnalysis?.rollBreakdown
              ? subAnalysis.rollBreakdown.length - 1
              : 0
            const rollBonus = powerupRolls * 0.4
            const total = Math.round((tierW + grindBonus + rollBonus) * 100) / 100
            const isTarget = sub.type === bestOptim.gemTarget?.remove
            return (
              <P
                key={idx}
                className={`text-muted-foreground/60 pl-2 ${isTarget ? 'text-destructive font-medium' : ''}`}
              >
                {formatStatLabel(sub.type)}: tier={tier}({tierW}) +{' '}
                {isGrindable ? `grindable(${grindBonus})` : `non-grind(0)`} + {powerupRolls} rolls(
                {rollBonus}) = {total}
                {isTarget ? ' <-- LOWEST' : ''}
              </P>
            )
          })}
          <P className="text-foreground font-medium pl-2">
            → Gem {formatStatLabel(bestOptim.gemTarget.remove)} →{' '}
            {formatStatLabel(bestOptim.gemTarget.replace)}
          </P>
          <P className="text-muted-foreground/60 pl-2">
            Rolls lost: {bestOptim.rollsLost} | Post-optim score: {bestOptim.postOptimScore}
          </P>
        </>
      ) : (
        <P className="text-success-foreground">
          No gem needed — all substats match archetype ({bestOptim.archetype})
        </P>
      )}
    </Div>
  )
}

function ConstantsSection({
  rune,
  setTiers,
}: {
  rune: RuneData
  setTiers: Record<string, StatTier> | undefined
}) {
  return (
    <Div className="space-y-0.5">
      <P className="font-bold text-[10px] text-foreground">Constants</P>
      {setTiers && (
        <Div className="space-y-0.5">
          <P className="text-muted-foreground">SET_STAT_TIERS[{rune.set}]:</P>
          <P className="text-muted-foreground/60 pl-2">
            {Object.entries(setTiers)
              .filter(([, t]) => t !== 'C' && t !== 'D')
              .map(([stat, tier]) => `${formatStatLabel(stat as StatType)}=${tier}`)
              .join(' ')}
          </P>
        </Div>
      )}
      <Div className="space-y-0.5">
        <P className="text-muted-foreground">
          TIER_WEIGHTS:{' '}
          {Object.entries(TIER_WEIGHTS)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}
        </P>
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
  )
}
