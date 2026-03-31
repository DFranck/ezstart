'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Div,
  P,
  Span,
  Strong,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ezstart/ui/components'

import { TIER_WEIGHTS } from '@gacha-analyzer/types'
import type { StatTier } from '@gacha-analyzer/types'

import {
  TIER_COLOR,
  ALL_STATS,
  weightColor,
  RUNE_SET_DATA,
  ARCHETYPES,
  WEIGHT_ROWS,
  SUBSTAT_VALUES,
  SLOTS,
  MAIN_STATS,
  ROLL_QUALITY_TIERS,
  SELL_GUIDE,
  ROLL_SYMBOLS,
  GEM_GRIND_RECS,
  SOURCES,
} from './data-constants'

import {
  TT,
  RankBadge,
  runeSetColumns,
  INITIAL_SET_SORTING,
  substatColumns,
  rollQualityColumns,
  rollSymbolColumns,
  gemGrindColumns,
} from './data-columns'

const SetRadarChart = dynamic(
  () => import('./set-radar-chart').then(mod => ({ default: mod.SetRadarChart })),
  {
    ssr: false,
    loading: () => <Div className="h-64 animate-pulse bg-muted rounded" />,
  }
)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameDataPage() {
  const params = useParams()
  const game = params.game as string
  const t = useTranslations('data')

  if (game !== 'summoners-war') {
    return (
      <Div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <P className="text-2xl font-bold mb-4">{t('comingSoon')}</P>
        <P className="text-muted-foreground">
          {t('comingSoonDescription', { game: game.replace(/-/g, ' ') })}
        </P>
      </Div>
    )
  }

  return (
    <Div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <Div className="mb-6">
        <P className="text-muted-foreground text-sm mt-1">{t('pageDescription')}</P>
      </Div>

      <Accordion type="multiple" defaultValue={['sets']} className="space-y-2">
        {/* ---- 1. Rune Sets ---- */}
        <AccordionItem value="sets">
          <AccordionTrigger className="text-base font-semibold">{t('runeSets')}</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                Complete overview of every rune set: bonus,{' '}
                <TT tip="S-tier sets have the best bonuses. Weaker sets need godlike substats to be worth keeping.">
                  set strength
                </TT>
                , and{' '}
                <TT tip="Tier list of stats per set. S=priority, D=useless. Used to weight efficiency per set.">
                  stat tiers
                </TT>
                .
              </P>

              <Div className="overflow-x-auto">
                <DataTable
                  columns={runeSetColumns}
                  data={RUNE_SET_DATA}
                  filterColumn="setKey"
                  filterPlaceholder="Filter by set name..."
                  pageSize={50}
                  hidePagination
                  initialSorting={INITIAL_SET_SORTING}
                  tableSize="compact"
                  maxHeight="320px"
                  stickyHeader
                />
              </Div>

              <SetRadarChart />

              <Card size="sm" className="border-primary/20 bg-primary/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">Tier Weights</P>
                  <Div className="flex flex-wrap gap-3 mt-2">
                    {(Object.entries(TIER_WEIGHTS) as [StatTier, number][]).map(
                      ([tier, weight]) => (
                        <Div key={tier} className="flex items-center gap-1.5">
                          <Span className={`text-sm ${TIER_COLOR[tier]}`}>{tier}</Span>
                          <Span className="text-xs text-muted-foreground">= {weight}</Span>
                        </Div>
                      )
                    )}
                  </Div>
                  <P className="text-xs text-muted-foreground mt-2">
                    Multiplier applied to each substat&apos;s efficiency based on its tier for this
                    set. A SPD substat tier S on Violent counts at 100%, but RES tier C only counts
                    at 20%.
                  </P>
                </CardContent>
              </Card>

              <P className="text-xs text-muted-foreground italic">
                Legend: <Span className="text-ga-tier-s font-bold">S</Span> priority,{' '}
                <Span className="text-ga-tier-a font-semibold">A</Span> important,{' '}
                <Span className="text-ga-tier-b">B</Span> useful,{' '}
                <Span className="text-ga-tier-c">C</Span> mediocre,{' '}
                <Span className="text-ga-tier-d">D</Span> useless. Str = Set Strength (how valuable
                the set bonus itself is).
              </P>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 2. Substat Values ---- */}
        <AccordionItem value="substat-values">
          <AccordionTrigger className="text-base font-semibold">
            {t('substatValues')}
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                Roll ranges (6-star),{' '}
                <TT tip="Grindstones add a flat bonus to a substat. Only grindable: HP, HP%, ATK, ATK%, DEF, DEF%, SPD.">
                  grindstone
                </TT>{' '}
                values, and{' '}
                <TT tip="Enchanted gems replace one substat entirely with a new value. Unlike grinds, gems can target ANY stat.">
                  enchanted gem
                </TT>{' '}
                values at a glance. &quot;-&quot; means the stat cannot be grinded.
              </P>

              <Div className="overflow-x-auto">
                <DataTable
                  columns={substatColumns}
                  data={SUBSTAT_VALUES}
                  filterColumn="stat"
                  filterPlaceholder="Filter by stat..."
                  pageSize={20}
                  hidePagination
                />
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 3. Build Archetypes (Advanced) ---- */}
        <AccordionItem value="archetypes">
          <AccordionTrigger className="text-base font-semibold">
            {t('buildArchetypes')}
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <Card size="sm" className="border-muted-foreground/20 bg-muted/10">
                <CardContent className="pt-3">
                  <P className="text-xs text-muted-foreground">
                    These are supplementary — the main analysis is set-based. Archetypes are
                    provided as extra context for advanced users.
                  </P>
                </CardContent>
              </Card>

              <P className="text-xs text-muted-foreground">
                Stat priorities and{' '}
                <TT tip="Numerical weights (0.05 to 1.0) that determine how much each stat contributes to the weighted efficiency score for a given archetype.">
                  numerical weights
                </TT>{' '}
                per build archetype.
              </P>

              <Div className="overflow-x-auto">
                <Table variant="striped" size="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">{t('archetype')}</TableHead>
                      <TableHead className="min-w-[200px]">{t('description')}</TableHead>
                      <TableHead className="min-w-[280px]">{t('statPriority')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ARCHETYPES.map(a => (
                      <TableRow key={a.name}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {a.description}
                        </TableCell>
                        <TableCell>
                          <Div className="flex flex-wrap gap-1">
                            {a.stats.map(s => (
                              <RankBadge key={s.stat} stat={s.stat} rank={s.rank} />
                            ))}
                          </Div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Div>

              <Div>
                <P className="font-medium text-sm mb-2">
                  <TT tip="These weights determine the weighted efficiency score. A weight of 1.0 means the stat is top priority; 0.05 means nearly useless.">
                    Stat Priority Weights
                  </TT>
                </P>
                <Div className="overflow-x-auto">
                  <Table size="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] sticky left-0 bg-background z-10">
                          Archetype
                        </TableHead>
                        {ALL_STATS.map(s => (
                          <TableHead key={s} className="text-center w-[52px] text-xs">
                            {s}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {WEIGHT_ROWS.map(row => (
                        <TableRow key={row.key}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Div className="flex items-center gap-1.5 cursor-help">
                                  <Span>{row.emoji}</Span>
                                  <Span className="font-medium text-xs">{row.archetype}</Span>
                                </Div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px]">
                                {row.description}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          {ALL_STATS.map(s => (
                            <TableCell
                              key={s}
                              className={`text-center tabular-nums text-xs ${weightColor(row.weights[s] ?? 0)}`}
                            >
                              {row.weights[s] ?? '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Div>
              </Div>

              <P className="text-xs text-muted-foreground italic">
                Color coding: <Span className="text-ga-roll-legend font-bold">1.0-0.9</Span> top
                priority, <Span className="text-ga-roll-hero font-semibold">0.7-0.89</Span> high,{' '}
                <Span className="text-ga-roll-rare">0.5-0.69</Span> medium,{' '}
                <Span className="text-ga-roll-magic">0.3-0.49</Span> low,{' '}
                <Span className="text-ga-roll-normal">below 0.3</Span> useless.
              </P>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 4. Roll Quality Tiers ---- */}
        <AccordionItem value="roll-quality">
          <AccordionTrigger className="text-base font-semibold">
            4.{' '}
            <TT tip="The average quality of each roll compared to the maximum possible value for that stat.">
              Roll Quality
            </TT>{' '}
            Tiers
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                <TT tip="The average quality of each roll compared to the maximum possible value for that stat.">
                  Roll Quality
                </TT>{' '}
                measures how close each substat roll landed to the maximum possible value. It
                replaces the old efficiency threshold system with a more intuitive tier system.
              </P>

              <DataTable
                columns={rollQualityColumns}
                data={ROLL_QUALITY_TIERS}
                pageSize={10}
                hidePagination
              />

              <Card size="sm" className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    Current vs{' '}
                    <TT tip="The quality tier if the worst substat (for the best matching archetype) is replaced by a legend enchanted gem. Shows the rune's true potential.">
                      Post-Gem
                    </TT>
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The scanner shows two quality tiers: <Strong>Current</Strong> (what the rune has
                    now) and <Strong>Post-Gem</Strong> (what it could become if you gem the worst
                    substat for the best archetype). A rune with &quot;Rare → Hero&quot; means
                    it&apos;s currently Rare quality but could reach Hero with a gem. This is used
                    by the{' '}
                    <TT tip="The advice considers both current quality and gem potential to determine whether to upgrade, keep, or sell.">
                      Progressive Advice
                    </TT>{' '}
                    to decide if the rune is worth investing in.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-primary/20 bg-primary/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="The standard Summoners War efficiency formula used by all optimizers. Named after the player Barion who popularized it.">
                      Barion Efficiency
                    </TT>{' '}
                    (Raw Efficiency)
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The raw efficiency formula:{' '}
                    <Span className="font-mono">
                      sum(substat_value / max_roll_value) / TOTAL_EVENTS * 100
                    </Span>
                    . For each substat, the ratio is{' '}
                    <Span className="font-mono">
                      current_value / (max_single_roll * number_of_rolls_into_that_stat)
                    </Span>
                    . TOTAL_EVENTS = 8 for a 6-star rune at +12 (initial 4 subs + 4 power-up rolls).
                    This gives a 0-100 score where 100 means every roll was max.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a +12 rune with SPD 18 (3 rolls max = 18), CR 12 (2 rolls max = 12),
                    HP% 8 (1 roll max = 8), DEF% 13 (2 rolls max = 16). Ratios: 18/18 + 12/12 + 8/8
                    + 13/16 = 1 + 1 + 1 + 0.81 = 3.81. Efficiency = 3.81/8 * 100 ={' '}
                    <Strong>47.6%</Strong>.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-ga-roll-hero/20 bg-ga-roll-hero/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="Projects what Barion efficiency the rune would reach at +12 if all remaining rolls go into the max value.">
                      Potential +12
                    </TT>
                  </P>
                  <P className="text-xs text-muted-foreground">
                    For runes not yet at +12, the scanner calculates what the efficiency WOULD be if
                    all remaining power-up rolls landed at max value. Formula:{' '}
                    <Span className="font-mono">
                      current_efficiency + (remaining_rolls * max_single_roll_ratio / TOTAL_EVENTS *
                      100)
                    </Span>
                    . A +6 rune has 2 rolls left, so potential adds up to 2 max-roll ratios.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a +6 rune with current efficiency 25% has 2 remaining rolls. Best case
                    each roll = 1.0 ratio, so potential = 25 + (2 * 1.0/8 * 100) = 25 + 25 ={' '}
                    <Strong>50%</Strong>. This is used by the progressive advice to decide if the
                    rune is worth upgrading further.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-ga-roll-legend/20 bg-ga-roll-legend/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="Efficiency score after applying maximum legend grindstones to all grindable substats. Shows the rune's ceiling after optimization.">
                      After Grind
                    </TT>{' '}
                    Efficiency
                  </P>
                  <P className="text-xs text-muted-foreground">
                    After calculating potential +12, the scanner adds the value of legend
                    grindstones to all grindable substats (HP, HP%, ATK, ATK%, DEF, DEF%, SPD).
                    Formula:{' '}
                    <Span className="font-mono">
                      potential_efficiency + sum(legend_grind_max / max_roll_value) / TOTAL_EVENTS *
                      100
                    </Span>{' '}
                    for each grindable stat present.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a rune at potential 50% with SPD (grind +5) and HP% (grind +10%). Grind
                    gain = (5/6 + 10/8) / 8 * 100 = (0.83 + 1.25) / 8 * 100 = <Strong>+26%</Strong>.
                    After Grind = 50 + 26 = <Strong>76%</Strong>. This is the rune&apos;s realistic
                    ceiling.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-ga-roll-rare/20 bg-ga-roll-rare/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="The final weighted efficiency after applying the best gem (replacing worst sub) and all grinds. Accounts for lost rolls in the replaced stat.">
                      Post-Optim Score
                    </TT>
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The post-optimization score is the weighted efficiency after applying both the
                    best enchanted gem AND all legend grinds. Unlike raw After Grind, this uses{' '}
                    <Strong>weighted</Strong> efficiency (stat importance matters) and accounts for
                    the fact that gemming replaces a substat — including any rolls that went into
                    the replaced stat (lost rolls).
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a Violent rune for a Bruiser with RES 12% (3 rolls). Gemming RES → HP%
                    removes 3 bad rolls but adds a legend gem value (7-11% HP%). The post-optim
                    score recalculates weighted efficiency with the new substat, re-applies grinds,
                    and gives the <Strong>true final score</Strong> used to rank runes.
                  </P>
                </CardContent>
              </Card>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 5. Progressive Sell Guide ---- */}
        <AccordionItem value="sell-guide">
          <AccordionTrigger className="text-base font-semibold">
            5.{' '}
            <TT tip="The advice considers both current quality AND gem/grind potential, not just the current efficiency number.">
              Progressive Sell Guide
            </TT>
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground mb-2">
                The progressive system evaluates runes at each power-up milestone. Unlike static
                thresholds, it considers what the rune COULD become (potential) — not just its
                current state. If the potential weighted efficiency after gemming exceeds the
                threshold, the advice is UPGRADE even if current efficiency looks low.
              </P>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <TT tip="Minimum weighted efficiency required at each level to keep upgrading. Below this = sell.">
                      Weighted Efficiency Thresholds
                    </TT>{' '}
                    by Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Div className="overflow-x-auto">
                    <Table size="compact">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Profile</TableHead>
                          <TableHead className="text-center">+0</TableHead>
                          <TableHead className="text-center">+3</TableHead>
                          <TableHead className="text-center">+6</TableHead>
                          <TableHead className="text-center">+9</TableHead>
                          <TableHead className="text-center">+12</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-ga-roll-magic">Early</TableCell>
                          <TableCell className="text-center tabular-nums">30</TableCell>
                          <TableCell className="text-center tabular-nums">35</TableCell>
                          <TableCell className="text-center tabular-nums">40</TableCell>
                          <TableCell className="text-center tabular-nums">45</TableCell>
                          <TableCell className="text-center tabular-nums">50</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-ga-roll-rare">Mid</TableCell>
                          <TableCell className="text-center tabular-nums">40</TableCell>
                          <TableCell className="text-center tabular-nums">45</TableCell>
                          <TableCell className="text-center tabular-nums">50</TableCell>
                          <TableCell className="text-center tabular-nums">55</TableCell>
                          <TableCell className="text-center tabular-nums">60</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-ga-roll-hero">Late</TableCell>
                          <TableCell className="text-center tabular-nums">50</TableCell>
                          <TableCell className="text-center tabular-nums">55</TableCell>
                          <TableCell className="text-center tabular-nums">60</TableCell>
                          <TableCell className="text-center tabular-nums">65</TableCell>
                          <TableCell className="text-center tabular-nums">70</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Div>
                </CardContent>
              </Card>

              <Card size="sm" className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">Auto-sell: Dead Stat Combos</P>
                  <P className="text-xs text-muted-foreground">
                    Runes with <Strong>ACC + RES</Strong> together are auto-sell. No monster needs
                    both stats — this combination means the rune has no viable archetype.
                  </P>
                </CardContent>
              </Card>

              <Div className="space-y-3">
                {SELL_GUIDE.map(step => (
                  <Card key={step.level} size="xs" className={`border ${step.color}`}>
                    <CardContent className="pt-3">
                      <Div className="flex items-start gap-3">
                        <Badge variant="outline" className="font-mono text-xs shrink-0 mt-0.5">
                          {step.level}
                        </Badge>
                        <Div>
                          <P className="font-medium text-sm">{step.action}</P>
                          <P className="text-xs text-muted-foreground mt-1">{step.details}</P>
                        </Div>
                      </Div>
                    </CardContent>
                  </Card>
                ))}
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 6. References (merged: Slot Stats + Main Stat Values + Roll Breakdown) ---- */}
        <AccordionItem value="references">
          <AccordionTrigger className="text-base font-semibold">6. References</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-6">
              {/* Sub-section: Stat Values by Slot */}
              <Div>
                <P className="font-bold text-sm mb-3">Stat Values by Slot</P>
                <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SLOTS.map(s => (
                    <Card key={s.slot} size="sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <Span>Slot {s.slot}</Span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">
                                ?
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              {s.tip}
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Div>
                          <P className="text-xs text-muted-foreground mb-1">Main stat</P>
                          {s.mainFixed ? (
                            <Badge variant="secondary" className="text-xs">
                              {s.mainFixed} (fixed)
                            </Badge>
                          ) : (
                            <Div className="flex flex-wrap gap-1">
                              {s.mainOptions.map(opt => (
                                <Badge key={opt} variant="outline" className="text-xs">
                                  {opt}
                                </Badge>
                              ))}
                            </Div>
                          )}
                        </Div>
                        <Div>
                          <P className="text-xs text-muted-foreground mb-1">Priority subs</P>
                          <Div className="flex flex-wrap gap-1">
                            {s.priority.map((stat, i) => (
                              <RankBadge key={stat} stat={stat} rank={i + 1} />
                            ))}
                          </Div>
                        </Div>
                      </CardContent>
                    </Card>
                  ))}
                </Div>
              </Div>

              <hr className="border-border" />

              {/* Sub-section: Main Stat Values */}
              <Div>
                <P className="font-bold text-sm mb-3">Main Stat Values (+0 to +15)</P>
                <Div className="space-y-4">
                  {MAIN_STATS.map(ms => (
                    <Div key={ms.stat}>
                      <P className="font-medium text-sm mb-2">
                        {ms.stat}{' '}
                        <Span className="text-muted-foreground text-xs">
                          (Slots {ms.slots.join(', ')})
                        </Span>
                      </P>
                      <Div className="overflow-x-auto">
                        <Table size="compact">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px]">Grade</TableHead>
                              {Array.from({ length: 16 }, (_, i) => (
                                <TableHead key={i} className="text-center w-[46px] text-xs">
                                  +{i}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-xs">6-star</TableCell>
                              {ms.values6.map((v, i) => (
                                <TableCell key={i} className="text-center tabular-nums text-xs">
                                  {v}
                                </TableCell>
                              ))}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-xs text-muted-foreground">
                                5-star
                              </TableCell>
                              {ms.values5.map((v, i) => (
                                <TableCell
                                  key={i}
                                  className="text-center tabular-nums text-xs text-muted-foreground"
                                >
                                  {v}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </Div>
                    </Div>
                  ))}
                </Div>
              </Div>

              <hr className="border-border" />

              {/* Sub-section: Roll Breakdown Symbols */}
              <Div>
                <P className="font-bold text-sm mb-3">
                  <TT tip="Each individual substat roll is graded from Legend to Normal based on how close it landed to the maximum possible value.">
                    Roll Breakdown
                  </TT>{' '}
                  Symbols
                </P>
                <Div className="space-y-4">
                  <P className="text-xs text-muted-foreground">
                    Each individual roll into a substat is graded based on how close it landed to
                    the maximum. The badges appear next to each substat in the rune card.
                  </P>

                  <DataTable
                    columns={rollSymbolColumns}
                    data={ROLL_SYMBOLS}
                    pageSize={10}
                    hidePagination
                  />

                  <Card size="sm" className="border-ga-roll-rare/20 bg-ga-roll-rare/5">
                    <CardContent className="pt-3">
                      <P className="font-medium text-sm mb-1">How to read a roll breakdown</P>
                      <P className="text-xs text-muted-foreground">
                        Example: <Span className="font-mono">SPD +18 (★●◆)</Span> means 3 rolls into
                        SPD. First roll was Legend (max), second Hero, third Rare. The overall
                        quality for that substat is the average of all individual rolls.
                      </P>
                      <P className="text-xs text-muted-foreground mt-1">
                        Roll quality is calculated as:{' '}
                        <Span className="font-mono">(value - min) / (max - min)</Span> for each
                        roll. A roll of 6 on SPD (range 4-6) ={' '}
                        <Span className="font-mono">(6-4)/(6-4) = 100%</Span> = Legend.
                      </P>
                    </CardContent>
                  </Card>
                </Div>
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 7. Gem/Grind Recommendations (Advanced) ---- */}
        <AccordionItem value="gem-grind-recs">
          <AccordionTrigger className="text-base font-semibold">
            7.{' '}
            <TT tip="Which stat to gem (replace the worst substat) and which stats to grind (add flat bonus) for each archetype.">
              Gem/Grind Recommendations
            </TT>{' '}
            by Archetype (Advanced)
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <Card size="sm" className="border-muted-foreground/20 bg-muted/10">
                <CardContent className="pt-3">
                  <P className="text-xs text-muted-foreground">
                    These are supplementary — the main gem target logic is now set-based.
                    Archetype-specific recommendations are provided as extra context.
                  </P>
                </CardContent>
              </Card>

              <P className="text-xs text-muted-foreground">
                For each archetype, typical gem targets and grind priorities.
              </P>

              <Card size="sm" className="border-warning/20 bg-warning/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="The priority order used by the scanner to decide which substat to replace with an enchanted gem.">
                      Gem Target Logic
                    </TT>{' '}
                    — Priority Order
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The scanner picks the gem target using this priority:{' '}
                    <Strong>1) Dead stats</Strong> (ACC on a DPS, RES on a bomber) →{' '}
                    <Strong>2) Flat stats</Strong> (ATK flat, DEF flat, HP flat — almost always
                    worse than %) → <Strong>3) Lowest weight stat</Strong> for the set. The gem
                    replacement is the highest-weight stat not already on the rune.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    <Strong>Never gem out:</Strong> SPD, CR, or CD — these are universally valuable
                    and the scanner will never recommend replacing them.
                  </P>
                </CardContent>
              </Card>

              <Div className="overflow-x-auto">
                <DataTable
                  columns={gemGrindColumns}
                  data={GEM_GRIND_RECS}
                  filterColumn="archetype"
                  filterPlaceholder="Filter by archetype..."
                  pageSize={20}
                  hidePagination
                />
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 8. Sources ---- */}
        <AccordionItem value="sources">
          <AccordionTrigger className="text-base font-semibold">8. Sources</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-2">
              {SOURCES.map(s => (
                <Card key={s.name} size="xs">
                  <CardContent className="pt-3">
                    <Div className="flex items-start justify-between gap-2">
                      <Div>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {s.name}
                        </a>
                        <P className="text-xs text-muted-foreground mt-0.5">{s.description}</P>
                      </Div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        Link
                      </Badge>
                    </Div>
                  </CardContent>
                </Card>
              ))}
              <P className="text-xs text-muted-foreground mt-3 italic">
                Data compiled from community sources. Values may vary with game updates.
              </P>
            </Div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Div>
  )
}
