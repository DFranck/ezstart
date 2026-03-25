'use client'

import { Badge, Card, CardContent, CardHeader, Div, H3, P, Progress, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { RuneData, RuneAnalysis, StatType, RuneQuality, BuildArchetype, ProgressiveAction, RollBreakdown } from '@game-analyzer/types'
import { BUILD_ARCHETYPES } from '@game-analyzer/types'
import { GEM_ICONS, GRIND_ICONS } from '../config/game-assets'
import { MonsterSuggestions } from './monster-suggestions'
import { SetIcon } from './rune-card-utils'

// ── Quality badge styles ──
const QUALITY_BG: Record<RuneQuality, string> = {
  legend: 'bg-ga-roll-legend/10 border-ga-roll-legend/30 text-ga-roll-legend',
  hero: 'bg-ga-roll-hero/10 border-ga-roll-hero/30 text-ga-roll-hero',
  rare: 'bg-ga-roll-rare/10 border-ga-roll-rare/30 text-ga-roll-rare',
  magic: 'bg-ga-roll-magic/10 border-ga-roll-magic/30 text-ga-roll-magic',
  normal: 'bg-muted text-muted-foreground',
}

type RollQualityTier = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

const ROLL_QUALITY_COLORS: Record<RollQualityTier, string> = {
  legend: 'text-ga-roll-legend',
  hero: 'text-ga-roll-hero',
  rare: 'text-ga-roll-rare',
  magic: 'text-ga-roll-magic',
  normal: 'text-ga-roll-normal',
}

function getRollQualityTier(rollQuality: number): RollQualityTier {
  if (rollQuality >= 90) return 'legend'
  if (rollQuality >= 75) return 'hero'
  if (rollQuality >= 50) return 'rare'
  if (rollQuality >= 25) return 'magic'
  return 'normal'
}

function getRollQualityColor(rollQuality: number): string {
  return ROLL_QUALITY_COLORS[getRollQualityTier(rollQuality)]
}

function getRollQualityBarColor(rollQuality: number): string {
  if (rollQuality >= 90) return '[&>div]:bg-ga-roll-legend'
  if (rollQuality >= 75) return '[&>div]:bg-ga-roll-hero'
  if (rollQuality >= 50) return '[&>div]:bg-ga-roll-rare'
  if (rollQuality >= 25) return '[&>div]:bg-ga-roll-magic'
  return '[&>div]:bg-ga-roll-normal'
}

function getRollQualityTierBarColor(tier: RuneQuality): string {
  switch (tier) {
    case 'legend': return '[&>div]:bg-ga-roll-legend'
    case 'hero': return '[&>div]:bg-ga-roll-hero'
    case 'rare': return '[&>div]:bg-ga-roll-rare'
    case 'magic': return '[&>div]:bg-ga-roll-magic'
    case 'normal': return '[&>div]:bg-ga-roll-normal'
  }
}

function getRollQualityTierTextColor(tier: RuneQuality): string {
  return ROLL_QUALITY_COLORS[tier] ?? ROLL_QUALITY_COLORS.normal
}

function formatStatValue(type: StatType, value: number): string {
  const percentStats: StatType[] = ['hp%', 'atk%', 'def%', 'cr', 'cd', 'res', 'acc']
  return percentStats.includes(type) ? `+${value}%` : `+${value}`
}

function formatStatLabel(type: StatType): string {
  return type.toUpperCase().replace('%', '%')
}

const ADVICE_COLORS: Record<ProgressiveAction, string> = {
  sell: 'border-destructive/50 bg-destructive/10 text-destructive-foreground',
  upgrade: 'border-ga-roll-rare/50 bg-ga-roll-rare/10 text-ga-roll-rare',
  keep: 'border-success/50 bg-success/10 text-success-foreground',
  grind: 'border-ga-roll-hero/50 bg-ga-roll-hero/10 text-ga-roll-hero',
}

const ADVICE_LABELS: Record<ProgressiveAction, string> = {
  sell: 'SELL',
  upgrade: 'UPGRADE',
  keep: 'KEEP',
  grind: 'GRIND',
}

const ADVICE_ICONS: Record<ProgressiveAction, string> = {
  upgrade: '\u2191',
  keep: '\u2713',
  grind: '\u2699',
  sell: '\u2715',
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

function getSynergyBadgeClass(matchCount: number): string {
  if (matchCount >= 4) return 'bg-ga-roll-legend/15 border-ga-roll-legend/40 text-ga-roll-legend'
  if (matchCount >= 3) return 'bg-success/15 border-success/40 text-success-foreground'
  return 'bg-muted border-border text-muted-foreground'
}

interface RuneCardDetailedProps {
  rune: RuneData
  analysis?: RuneAnalysis
  confidence?: number
}

export function RuneCardDetailed({ rune, analysis, confidence }: RuneCardDetailedProps) {
  const t = useTranslations('labels')
  const tRune = useTranslations('rune')

  const quality = rune.quality ?? 'normal'
  const gradeStars = Array.from({ length: rune.grade }, () => '\u2605').join('')
  const rollQualityTier = analysis?.rollQualityTier ?? 'normal'
  const rollQualityPostGem = analysis?.rollQualityPostGem ?? 'normal'

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-2 px-3 pt-3">
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-2">
            <SetIcon set={rune.set} className="w-6 h-6" />
            <H3 className="text-base font-bold capitalize">{rune.set}</H3>
            <Badge variant="outline" className="text-xs">Slot {rune.slot}</Badge>
          </Div>
          <Badge className={`border text-xs ${QUALITY_BG[quality]}`}>
            {tRune(`quality.${quality}`)}
          </Badge>
        </Div>
        <Div className="flex items-center gap-2">
          <P className="text-ga-roll-legend text-xs tracking-tighter leading-none">{gradeStars}</P>
          <Badge variant="secondary" className="text-xs">+{rune.level}</Badge>
        </Div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3">
        {/* ── Progressive Advice (prominent at top) ── */}
        {analysis?.progressiveAdvice && (() => {
          const advice = analysis.progressiveAdvice
          return (
            <Div className={`p-3 rounded-lg border-2 ${ADVICE_COLORS[advice.action]}`}>
              <P className="font-bold text-lg">
                {ADVICE_ICONS[advice.action]} {ADVICE_LABELS[advice.action]}
                {advice.action === 'sell'
                  ? (advice.sellProbability > 0 ? ` \u2014 ${tRune('sellRisk', { percent: String(advice.sellProbability) })}` : '')
                  : (advice.sellProbability > 0 ? ` \u2014 ${tRune('keepChance', { percent: String(100 - advice.sellProbability) })}` : '')}
              </P>
              <P className="text-xs text-muted-foreground mt-1">
                {advice.reasonKey ? tRune(`adviceReason.${advice.reasonKey}`, advice.reasonParams ?? {}) : advice.reason}
              </P>
              {advice.nextCheckAt > 0 && (
                <P className="text-xs opacity-70 mt-1">{tRune('nextCheck', { level: String(advice.nextCheckAt) })}</P>
              )}
            </Div>
          )
        })()}

        {/* ── Main stat ── */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('mainStat')}</P>
          <Div className="flex items-center justify-between">
            <P className="text-sm font-semibold text-muted-foreground">
              {formatStatLabel(rune.mainStat.type)}
            </P>
            <P className="text-sm font-bold text-foreground">{formatStatValue(rune.mainStat.type, rune.mainStat.value)}</P>
          </Div>
        </Div>

        {/* ── Innate stat ── */}
        {rune.innateStat && (
          <Div>
            <P className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('innateStat')}</P>
            <Div className="flex items-center justify-between">
              <P className="text-sm text-muted-foreground">
                {formatStatLabel(rune.innateStat.type)}
              </P>
              <P className="text-sm font-medium text-foreground">{formatStatValue(rune.innateStat.type, rune.innateStat.value)}</P>
            </Div>
          </Div>
        )}

        {/* ── Separator ── */}
        <Div className="border-t border-border" />

        {/* ── Substats with progress bars ── */}
        <Div>
          <P className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('subStats')}</P>
          <Div className="space-y-2">
            {rune.subStats.map((stat, i) => {
              const subAnalysis = analysis?.substats.find(s => s.type === stat.type)
              const breakdown = subAnalysis?.rollBreakdown
              return (
                <Div key={i} className="space-y-1">
                  <Div className="flex items-center justify-between text-sm">
                    <Div className="flex items-center gap-1.5">
                      <P className="font-medium text-muted-foreground">
                        {formatStatLabel(stat.type)}
                      </P>
                      {subAnalysis?.isGemTarget && analysis?.archetypeOptimizations && (
                        <>
                          {analysis.archetypeOptimizations
                            .filter(opt => opt.gemTarget?.remove === stat.type)
                            .map(opt => {
                              const archKey = opt.archetype as BuildArchetype
                              const emoji = BUILD_ARCHETYPES[archKey]?.emoji ?? ''
                              return (
                                <Badge key={opt.archetype} variant="outline" className="text-[9px] px-1 py-0 border-warning/40 bg-warning/10 text-warning-foreground">
                                  <img src={GEM_ICONS.legend} alt="gem" className="w-3 h-3 inline" />
                                  {'\u2192'}{formatStatLabel(opt.gemTarget!.replace)} ({emoji})
                                </Badge>
                              )
                            })}
                        </>
                      )}
                    </Div>
                    <Div className="flex items-center gap-2">
                      <P className={`font-semibold ${subAnalysis ? getRollQualityColor(subAnalysis.efficiency) : 'text-foreground'}`}>{formatStatValue(stat.type, stat.value)}</P>
                      {subAnalysis && (
                        <P className="text-xs">
                          <span className={getRollQualityColor(subAnalysis.efficiency)}>{tRune(`rollQuality.${getRollQualityTier(subAnalysis.efficiency)}`)}</span>
                          <span className="text-muted-foreground"> ({subAnalysis.rolls} {subAnalysis.rolls > 1 ? tRune('rolls') : tRune('roll')})</span>
                        </P>
                      )}
                    </Div>
                  </Div>
                  {/* Roll breakdown badges */}
                  {breakdown && breakdown.length > 0 && (
                    <Div className="flex items-center gap-1 pl-1">
                      {breakdown.map((roll, j) => (
                        <Badge key={j} variant="outline" className={`text-[10px] px-1.5 py-0 border ${ROLL_TIER_BG[roll.tier]}`}>
                          {formatRollValue(stat.type, roll.value)}
                        </Badge>
                      ))}
                    </Div>
                  )}
                  {subAnalysis && (
                    <Progress
                      value={subAnalysis.efficiency}
                      className={`h-1.5 ${getRollQualityBarColor(subAnalysis.efficiency)}`}
                    />
                  )}
                  {/* Grind potential inline */}
                  {subAnalysis?.grindable && subAnalysis.grindAmount && subAnalysis.grindAmount > 0 && (
                    <P className="text-[10px] text-muted-foreground pl-1">
                      Grind: {formatStatValue(stat.type, stat.value)}{'\u2192'}{formatStatValue(stat.type, subAnalysis.grindedValue!)}
                    </P>
                  )}
                </Div>
              )
            })}
          </Div>
        </Div>

        {/* ── Roll Quality ── */}
        {analysis && (
          <>
            <Div className="border-t border-border" />
            <Div className="space-y-2">
              <P className="text-sm font-medium">{tRune('rollQualityTitle')}</P>
              <Div className="space-y-1.5">
                <Div className="flex items-center justify-between text-sm">
                  <P className="text-muted-foreground">{tRune('currentRolls')}</P>
                  <Div className="flex items-center gap-2">
                    <Badge className={`border text-xs ${ROLL_TIER_BG[rollQualityTier]}`}>
                      {tRune(`rollQuality.${rollQualityTier}`)} ({analysis.rollQualityPercent}%)
                    </Badge>
                  </Div>
                </Div>
                <Progress
                  value={analysis.rollQualityPercent}
                  className={`h-2.5 ${getRollQualityTierBarColor(rollQualityTier)}`}
                />
                {rollQualityPostGem !== rollQualityTier && (
                  <Div className="flex items-center justify-between text-sm">
                    <P className="text-muted-foreground">{tRune('afterGemRolls')}</P>
                    <Badge className={`border text-xs ${ROLL_TIER_BG[rollQualityPostGem]}`}>
                      {tRune(`rollQuality.${rollQualityPostGem}`)} ({analysis.rollQualityPostGemPercent}%)
                    </Badge>
                  </Div>
                )}
              </Div>

              {/* Efficiency details grid */}
              <Div className="grid grid-cols-2 gap-2 text-sm">
                {analysis.potentialEfficiency !== undefined && (
                  <Div className="flex items-center justify-between">
                    <P className="text-muted-foreground">{tRune('potential12')}</P>
                    <P className="font-medium">{analysis.potentialEfficiency}%</P>
                  </Div>
                )}
                {analysis.grindedEfficiency !== undefined && (
                  <Div className="flex items-center justify-between">
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
            </Div>
          </>
        )}

        {/* ── Archetype optimizations ── */}
        {analysis?.archetypeOptimizations && analysis.archetypeOptimizations.length > 0 && (
          <>
            <Div className="border-t border-border" />
            <Div className="space-y-2">
              <P className="text-sm font-medium">{tRune('optimization')}</P>
              <Div className="space-y-2">
                {analysis.archetypeOptimizations.map(opt => {
                  const archKey = opt.archetype as BuildArchetype
                  const emoji = BUILD_ARCHETYPES[archKey]?.emoji ?? ''
                  return (
                    <Div key={opt.archetype} className="space-y-1">
                      <Div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`cursor-default text-[11px] px-1.5 py-0 ${getSynergyBadgeClass(opt.matchCount)}`}
                        >
                          {emoji} {tRune(`archetype.${archKey}`)} {opt.matchCount}/4
                        </Badge>
                        {opt.isPerfect ? (
                          <P className="text-success-foreground text-xs">{'\u2713'} {tRune('perfectBuild')}</P>
                        ) : opt.gemTarget && (
                          <Div className="flex items-center gap-1">
                            <img src={GEM_ICONS.legend} alt="gem" className="w-4 h-4" />
                            <P className="text-xs text-muted-foreground">
                              {tRune('gemSwap', { remove: formatStatLabel(opt.gemTarget.remove), replace: formatStatLabel(opt.gemTarget.replace) })}
                            </P>
                          </Div>
                        )}
                        {opt.grindTargets.length > 0 && (
                          <Div className="flex items-center gap-1">
                            <img src={GRIND_ICONS.legend} alt="grind" className="w-4 h-4" />
                            <P className="text-xs text-muted-foreground">{tRune('grindLabel')}: {opt.grindTargets.map(s => formatStatLabel(s)).join(', ')}</P>
                          </Div>
                        )}
                      </Div>
                      <P className="text-[11px] text-muted-foreground pl-1">{tRune('postOptim', { score: String(opt.postOptimScore) })}</P>
                    </Div>
                  )
                })}
              </Div>
            </Div>
          </>
        )}
        {/* ── No synergy warning ── */}
        {analysis?.synergy && !analysis.archetypeOptimizations?.length && analysis.synergy.synergyBonus < 0 && (
          <>
            <Div className="border-t border-border" />
            <Div className="flex items-center justify-between">
              <P className="text-sm font-medium">{tRune('synergy')}</P>
              <P className="text-sm text-destructive-foreground">{tRune('noSynergy')} ({analysis.synergy.synergyBonus}%)</P>
            </Div>
          </>
        )}

        {/* ── Monster suggestions ── */}
        {analysis?.synergy && (() => {
          const suggestedArchetypes = (analysis.synergy.allArchetypes ?? [])
            .filter(a => a.matchCount >= 3)
            .map(a => a.archetype)
          if (suggestedArchetypes.length === 0) return null
          return (
            <>
              <Div className="border-t border-border" />
              <MonsterSuggestions archetypes={suggestedArchetypes} />
            </>
          )
        })()}

        {/* ── Set bonus ── */}
        {analysis && (
          <>
            <Div className="border-t border-border" />
            <Div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">{tRune('setBonus')}</P>
              <P className="font-medium">
                {analysis.setBonus} ({analysis.setPieces} pcs)
              </P>
            </Div>
          </>
        )}

        {/* ── OCR Confidence ── */}
        {confidence !== undefined && (
          <Div className="flex justify-end pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Div className="flex items-center gap-1 cursor-default">
                    <Div
                      className={`h-1.5 w-1.5 rounded-full ${
                        confidence >= 80 ? 'bg-success' : confidence >= 50 ? 'bg-warning' : 'bg-destructive'
                      }`}
                    />
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
