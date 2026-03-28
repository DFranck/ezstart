'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
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
  DataTableColumnHeader,
  type ColumnDef,
  type SortingState,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
  Div,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
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

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'

import {
  SET_STAT_TIERS,
  TIER_WEIGHTS,
  SET_STRENGTH,
  SET_ARCHETYPE_AFFINITY,
  BUILD_ARCHETYPES,
  STAT_PRIORITY_WEIGHTS,
  RUNE_SET_INFO,
} from '@game-analyzer/types'
import type { StatTier, BuildArchetype } from '@game-analyzer/types'

import { RUNE_SET_ICONS } from '@/config/game-assets'

// ---------------------------------------------------------------------------
// Tooltip helper — wraps a term with a tooltip explanation
// ---------------------------------------------------------------------------

function TT({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 cursor-help">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Shared constants & helpers
// ---------------------------------------------------------------------------

const RANK_COLORS: Record<number, string> = {
  1: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/40',
  2: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/40',
  3: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  4: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/40',
  5: 'bg-ga-roll-normal/20 text-ga-roll-normal border-ga-roll-normal/40',
}

function RankBadge({ stat, rank }: { stat: string; rank: number }) {
  return (
    <Badge variant="outline" className={`text-xs border ${RANK_COLORS[rank] ?? RANK_COLORS[5]}`}>
      {stat}
    </Badge>
  )
}

const TIER_COLOR: Record<StatTier, string> = {
  S: 'text-ga-tier-s font-bold',
  A: 'text-ga-tier-a font-semibold',
  B: 'text-ga-tier-b',
  C: 'text-ga-tier-c',
  D: 'text-ga-tier-d',
}

const TIER_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }

const TIER_STATS = ['spd', 'cr', 'cd', 'atk%', 'hp%', 'def%', 'acc', 'res', 'hp', 'atk', 'def'] as const
const TIER_STAT_LABELS: Record<string, string> = {
  spd: 'SPD', cr: 'CR', cd: 'CD', 'atk%': 'ATK%', 'hp%': 'HP%', 'def%': 'DEF%',
  acc: 'ACC', res: 'RES', hp: 'HP', atk: 'ATK', def: 'DEF',
}

// Radar chart only shows % and rate stats (not flat hp/atk/def)
const RADAR_STATS = ['spd', 'cr', 'cd', 'atk%', 'hp%', 'def%', 'acc', 'res'] as const

const ALL_STATS = ['SPD', 'CR', 'CD', 'ATK%', 'HP%', 'DEF%', 'ACC', 'RES', 'ATK', 'DEF', 'HP']

function weightColor(w: number): string {
  if (w >= 0.9) return 'text-ga-roll-legend font-bold'
  if (w >= 0.7) return 'text-ga-roll-hero font-semibold'
  if (w >= 0.5) return 'text-ga-roll-rare'
  if (w >= 0.3) return 'text-ga-roll-magic'
  return 'text-ga-roll-normal'
}

// ---------------------------------------------------------------------------
// Section 1 — Rune Sets (merged: sets + set stat tiers + set archetype affinity)
// ---------------------------------------------------------------------------

const SET_KEYS = Object.keys(SET_STAT_TIERS)

interface RuneSetRow {
  setKey: string
  strength: StatTier | undefined
  pieces: number | undefined
  bonus: string | undefined
  icon: string | undefined
  archetypes: string[]
  tiers: Record<string, StatTier>
}

const RUNE_SET_DATA: RuneSetRow[] = SET_KEYS.map((setKey) => {
  const tiers = SET_STAT_TIERS[setKey]!
  const info = RUNE_SET_INFO[setKey as keyof typeof RUNE_SET_INFO]
  const strength = SET_STRENGTH[setKey]
  const affinity = SET_ARCHETYPE_AFFINITY[setKey as keyof typeof SET_ARCHETYPE_AFFINITY]
  const icon = RUNE_SET_ICONS[setKey]
  return {
    setKey,
    strength,
    pieces: info?.pieces,
    bonus: info?.bonus,
    icon,
    archetypes: (affinity ?? []) as string[],
    tiers: tiers as Record<string, StatTier>,
  }
})

function tierSortFn(a: string | undefined, b: string | undefined): number {
  return (TIER_ORDER[b ?? ''] ?? 0) - (TIER_ORDER[a ?? ''] ?? 0)
}

const runeSetColumns: ColumnDef<RuneSetRow, unknown>[] = [
  {
    accessorKey: 'setKey',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Set" />,
    cell: ({ row }) => {
      const { setKey, icon, pieces, bonus } = row.original
      return (
        <Div className="flex items-center gap-1.5">
          {icon ? (
            <img src={icon} alt={setKey} width={24} height={24} className="shrink-0" />
          ) : (
            <Span className="text-sm">📦</Span>
          )}
          <Div className="flex flex-col leading-tight">
            <Span className="font-medium text-xs capitalize">{setKey}</Span>
            {(pieces || bonus) && (
              <Span className="text-[10px] text-muted-foreground">
                {pieces ? `${pieces}pcs` : ''}{pieces && bonus ? ' — ' : ''}{bonus ?? ''}
              </Span>
            )}
          </Div>
        </Div>
      )
    },
    filterFn: 'includesString',
  },
  {
    accessorKey: 'strength',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Str" className="justify-center" />,
    cell: ({ row }) => {
      const strength = row.original.strength
      return (
        <Span className={`text-center text-xs block ${strength ? TIER_COLOR[strength] : ''}`}>
          {strength ?? '-'}
        </Span>
      )
    },
    sortingFn: (rowA, rowB) => tierSortFn(rowA.original.strength, rowB.original.strength),
  },
  ...TIER_STATS.map((stat): ColumnDef<RuneSetRow, unknown> => ({
    id: `tier_${stat}`,
    accessorFn: (row) => row.tiers[stat],
    header: ({ header }) => <DataTableColumnHeader header={header} title={TIER_STAT_LABELS[stat]!} className="justify-center" />,
    cell: ({ row }) => {
      const tier = row.original.tiers[stat] as StatTier | undefined
      return (
        <Span className={`text-center tabular-nums text-xs block ${tier ? TIER_COLOR[tier] : ''}`}>
          {tier ?? '-'}
        </Span>
      )
    },
    sortingFn: (rowA, rowB) => tierSortFn(rowA.original.tiers[stat], rowB.original.tiers[stat]),
  })),
]

const INITIAL_SET_SORTING: SortingState = [{ id: 'strength', desc: false }]

// ---------------------------------------------------------------------------
// Section 1 — Radar Chart helpers
// ---------------------------------------------------------------------------

function SetRadarChart() {
  const [set1, setSet1] = useState<string>(SET_KEYS[0]!)
  const [set2, setSet2] = useState<string>('none')

  const hasSet2 = set2 !== '' && set2 !== 'none'

  const radarData = useMemo(() => {
    return RADAR_STATS.map((stat) => {
      const tiers1 = SET_STAT_TIERS[set1]
      const tier1 = tiers1?.[stat] as StatTier | undefined
      const val1 = tier1 ? (TIER_WEIGHTS[tier1] ?? 0) : 0

      let val2 = 0
      if (hasSet2) {
        const tiers2 = SET_STAT_TIERS[set2]
        const tier2 = tiers2?.[stat] as StatTier | undefined
        val2 = tier2 ? (TIER_WEIGHTS[tier2] ?? 0) : 0
      }

      return {
        stat: TIER_STAT_LABELS[stat]!,
        set1: val1,
        ...(hasSet2 ? { set2: val2 } : {}),
      }
    })
  }, [set1, set2, hasSet2])

  const chartConfig: ChartConfig = {
    set1: {
      label: set1.charAt(0).toUpperCase() + set1.slice(1),
      color: 'var(--color-ga-stat-spd)',
    },
    ...(hasSet2 ? {
      set2: {
        label: set2.charAt(0).toUpperCase() + set2.slice(1),
        color: 'var(--color-ga-stat-crit)',
      },
    } : {}),
  }

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Set Stat Profile — Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <Div className="flex flex-wrap gap-3 mb-4">
          <Div className="space-y-1">
            <P className="text-xs text-muted-foreground">Set 1</P>
            <Select value={set1} onValueChange={setSet1}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SET_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    <span className="capitalize">{k}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>
          <Div className="space-y-1">
            <P className="text-xs text-muted-foreground">Set 2 (compare)</P>
            <Select value={set2} onValueChange={setSet2}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {SET_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    <span className="capitalize">{k}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>
        </Div>

        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis
              dataKey="stat"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, 1]}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }}
              tickCount={6}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar
              name={(chartConfig.set1?.label ?? 'Set 1') as string}
              dataKey="set1"
              stroke="var(--color-ga-stat-spd)"
              fill="var(--color-ga-stat-spd)"
              fillOpacity={0.25}
            />
            {hasSet2 && (
              <Radar
                name={chartConfig.set2?.label as string}
                dataKey="set2"
                stroke="var(--color-ga-stat-crit)"
                fill="var(--color-ga-stat-crit)"
                fillOpacity={0.25}
              />
            )}
            {hasSet2 && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
          </RadarChart>
        </ChartContainer>

        <P className="text-xs text-muted-foreground mt-2 text-center">
          Values are tier weights: S=1.0, A=0.8, B=0.5, C=0.2, D=0.0
        </P>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Section 2 — Build Archetypes (merged: stat priority + stat weights)
// ---------------------------------------------------------------------------

type StatPriority = { stat: string; rank: number }

interface Archetype {
  name: string
  description: string
  stats: StatPriority[]
}

const ARCHETYPES: Archetype[] = [
  { name: 'Swift Attacker', description: 'Speed-scaling nuker (Lushen, Kaki)', stats: [{ stat: 'SPD', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'ATK%', rank: 4 }] },
  { name: 'Slow Cleave', description: 'Shield/Will nuker (Tiana comps)', stats: [{ stat: 'ATK%', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'SPD', rank: 4 }] },
  { name: 'Bruiser', description: 'Tanky DPS (Perna, Mo Long)', stats: [{ stat: 'HP%', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'SPD', rank: 4 }, { stat: 'ATK%', rank: 5 }] },
  { name: 'Speed Support', description: 'Turn 1 support (Bernard, Megan)', stats: [{ stat: 'SPD', rank: 1 }, { stat: 'HP%', rank: 2 }, { stat: 'DEF%', rank: 3 }, { stat: 'ACC', rank: 4 }] },
  { name: 'Tank Support', description: 'Healer / buffer (Fran, Riley)', stats: [{ stat: 'HP%', rank: 1 }, { stat: 'SPD', rank: 2 }, { stat: 'DEF%', rank: 3 }, { stat: 'RES', rank: 4 }] },
  { name: 'CC / Debuffer', description: 'Control (Poseidon, Hathor)', stats: [{ stat: 'SPD', rank: 1 }, { stat: 'ACC', rank: 2 }, { stat: 'HP%', rank: 3 }, { stat: 'DEF%', rank: 4 }] },
  { name: 'Bomb', description: 'Bomber (Seara, Malaka)', stats: [{ stat: 'ATK%', rank: 1 }, { stat: 'SPD', rank: 2 }, { stat: 'ACC', rank: 3 }, { stat: 'HP%', rank: 4 }] },
  { name: 'Raid DD', description: 'R5 damage dealer (Kro, Baleygr)', stats: [{ stat: 'CD', rank: 1 }, { stat: 'ATK%', rank: 2 }, { stat: 'CR', rank: 3 }, { stat: 'SPD', rank: 4 }, { stat: 'RES', rank: 5 }] },
  { name: 'Raid FL', description: 'R5 frontline (Darion, Dias)', stats: [{ stat: 'HP%', rank: 1 }, { stat: 'DEF%', rank: 2 }, { stat: 'RES', rank: 3 }, { stat: 'SPD', rank: 4 }, { stat: 'ACC', rank: 5 }] },
  { name: 'Speed DB/GB', description: 'Dungeon speed team', stats: [{ stat: 'SPD', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'ATK%', rank: 4 }, { stat: 'ACC', rank: 5 }] },
  { name: 'Def Scaler', description: 'DEF-based DD (Copper, Bulldozer)', stats: [{ stat: 'DEF%', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'SPD', rank: 4 }] },
  { name: 'HP Scaler', description: 'HP-based DD (Rina, Arnold)', stats: [{ stat: 'HP%', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'SPD', rank: 4 }, { stat: 'DEF%', rank: 5 }] },
  { name: 'Vampire DD', description: 'Self-sustain DPS (Trevor, Laika)', stats: [{ stat: 'ATK%', rank: 1 }, { stat: 'CR', rank: 2 }, { stat: 'CD', rank: 3 }, { stat: 'SPD', rank: 4 }, { stat: 'HP%', rank: 5 }] },
  { name: 'Pure Tank', description: 'Wall / stall (Rina, Praha)', stats: [{ stat: 'HP%', rank: 1 }, { stat: 'DEF%', rank: 2 }, { stat: 'SPD', rank: 3 }, { stat: 'RES', rank: 4 }] },
]

// Stat priority weights table data (from @game-analyzer/types STAT_PRIORITY_WEIGHTS)
interface WeightRow {
  archetype: string
  key: BuildArchetype
  emoji: string
  description: string
  weights: Record<string, number>
}

const WEIGHT_ROWS: WeightRow[] = (Object.entries(BUILD_ARCHETYPES) as [BuildArchetype, { name: string; emoji: string; description: string }][]).map(([key, info]) => {
  const rawWeights = STAT_PRIORITY_WEIGHTS[key]
  const weights: Record<string, number> = {}
  for (const s of ALL_STATS) {
    const lowerKey = s.toLowerCase() as keyof typeof rawWeights
    weights[s] = rawWeights[lowerKey] ?? 0
  }
  return { archetype: info.name, key, emoji: info.emoji, description: info.description, weights }
})

// ---------------------------------------------------------------------------
// Section 3 — Slot Stats
// ---------------------------------------------------------------------------

interface SlotInfo {
  slot: number
  mainFixed: string | null
  mainOptions: string[]
  priority: string[]
  tip: string
}

const SLOTS: SlotInfo[] = [
  { slot: 1, mainFixed: 'ATK flat', mainOptions: [], priority: ['SPD', 'CR', 'CD', 'ATK%'], tip: 'Main stat always ATK flat. Focus on damage substats for DDs or SPD/HP% for supports.' },
  { slot: 2, mainFixed: null, mainOptions: ['SPD', 'ATK%', 'DEF%', 'HP%', 'ATK flat', 'DEF flat', 'HP flat'], priority: ['SPD', 'CR', 'CD', 'HP%', 'ATK%'], tip: 'SPD is the most desired main stat. ATK%/HP%/DEF% for slower builds. Flat main stats are trash.' },
  { slot: 3, mainFixed: 'DEF flat', mainOptions: [], priority: ['SPD', 'CR', 'CD', 'HP%', 'ATK%'], tip: 'Main stat always DEF flat. Same substat priorities as slot 1.' },
  { slot: 4, mainFixed: null, mainOptions: ['CR', 'CD', 'ATK%', 'DEF%', 'HP%', 'ATK flat', 'DEF flat', 'HP flat'], priority: ['SPD', 'CR', 'CD', 'ATK%', 'HP%'], tip: 'CR/CD for damage dealers. HP%/DEF% for tanks. CR slot 4 is king for early game.' },
  { slot: 5, mainFixed: 'HP flat', mainOptions: [], priority: ['SPD', 'CR', 'CD', 'ATK%', 'HP%'], tip: 'Main stat always HP flat. Like slots 1/3, focus on good substats.' },
  { slot: 6, mainFixed: null, mainOptions: ['ATK%', 'DEF%', 'HP%', 'ACC', 'RES', 'ATK flat', 'DEF flat', 'HP flat'], priority: ['SPD', 'HP%', 'ATK%', 'ACC', 'CR'], tip: 'ATK% for DDs, HP% for tanks, ACC for debuffers. RES for raid. Most versatile slot.' },
]

// ---------------------------------------------------------------------------
// Section 4 — Substat Values (merged: roll ranges + grindstone & gem values)
// ---------------------------------------------------------------------------

interface SubstatValueRow {
  stat: string
  min: number
  max: number
  unit: string
  grind: { magic: string; rare: string; hero: string; legend: string }
  gem: { magic: string; rare: string; hero: string; legend: string }
}

const SUBSTAT_VALUES: SubstatValueRow[] = [
  { stat: 'HP flat', min: 135, max: 375, unit: '', grind: { magic: '100-200', rare: '180-250', hero: '230-450', legend: '430-550' }, gem: { magic: '100-200', rare: '180-280', hero: '250-420', legend: '400-580' } },
  { stat: 'HP%', min: 5, max: 8, unit: '%', grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'ATK flat', min: 10, max: 20, unit: '', grind: { magic: '6-12', rare: '10-18', hero: '12-22', legend: '18-30' }, gem: { magic: '8-12', rare: '10-16', hero: '15-23', legend: '20-30' } },
  { stat: 'ATK%', min: 5, max: 8, unit: '%', grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'DEF flat', min: 10, max: 20, unit: '', grind: { magic: '6-12', rare: '10-18', hero: '12-22', legend: '18-30' }, gem: { magic: '8-12', rare: '10-16', hero: '15-23', legend: '20-30' } },
  { stat: 'DEF%', min: 5, max: 8, unit: '%', grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'SPD', min: 4, max: 6, unit: '', grind: { magic: '1-2', rare: '2-3', hero: '3-4', legend: '4-5' }, gem: { magic: '1-3', rare: '2-4', hero: '3-6', legend: '5-8' } },
  { stat: 'CR', min: 4, max: 6, unit: '%', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-3%', rare: '3-5%', hero: '4-6%', legend: '5-8%' } },
  { stat: 'CD', min: 4, max: 7, unit: '%', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '3-5%', hero: '4-7%', legend: '5-9%' } },
  { stat: 'RES', min: 4, max: 8, unit: '%', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'ACC', min: 4, max: 8, unit: '%', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
]

const substatColumns: ColumnDef<SubstatValueRow, unknown>[] = [
  {
    accessorKey: 'stat',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Stat" />,
    cell: ({ row }) => <Span className="font-medium text-xs">{row.original.stat}</Span>,
  },
  {
    accessorKey: 'min',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Min Roll" className="justify-center" />,
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.min}{row.original.unit}</Span>,
  },
  {
    accessorKey: 'max',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Max Roll" className="justify-center" />,
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.max}{row.original.unit}</Span>,
  },
  {
    id: 'grind_magic',
    accessorFn: (row) => row.grind.magic,
    header: 'Grind Mag',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.grind.magic}</Span>,
    enableSorting: false,
  },
  {
    id: 'grind_rare',
    accessorFn: (row) => row.grind.rare,
    header: 'Grind Rare',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.grind.rare}</Span>,
    enableSorting: false,
  },
  {
    id: 'grind_hero',
    accessorFn: (row) => row.grind.hero,
    header: 'Grind Hero',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.grind.hero}</Span>,
    enableSorting: false,
  },
  {
    id: 'grind_legend',
    accessorFn: (row) => row.grind.legend,
    header: 'Grind Leg',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.grind.legend}</Span>,
    enableSorting: false,
  },
  {
    id: 'gem_magic',
    accessorFn: (row) => row.gem.magic,
    header: 'Gem Mag',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.gem.magic}</Span>,
    enableSorting: false,
  },
  {
    id: 'gem_rare',
    accessorFn: (row) => row.gem.rare,
    header: 'Gem Rare',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.gem.rare}</Span>,
    enableSorting: false,
  },
  {
    id: 'gem_hero',
    accessorFn: (row) => row.gem.hero,
    header: 'Gem Hero',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.gem.hero}</Span>,
    enableSorting: false,
  },
  {
    id: 'gem_legend',
    accessorFn: (row) => row.gem.legend,
    header: 'Gem Leg',
    cell: ({ row }) => <Span className="text-center tabular-nums text-xs block">{row.original.gem.legend}</Span>,
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Section 5 — Main Stat Values (+0 to +15)
// ---------------------------------------------------------------------------

interface MainStatTable {
  stat: string
  slots: number[]
  values6: number[]
  values5: number[]
}

const MAIN_STATS: MainStatTable[] = [
  { stat: 'HP flat', slots: [5], values6: [360, 435, 510, 585, 660, 735, 810, 885, 960, 1035, 1110, 1185, 1260, 1335, 1410, 1485], values5: [270, 333, 396, 459, 522, 585, 648, 711, 774, 837, 900, 963, 1026, 1089, 1152, 1215] },
  { stat: 'ATK flat', slots: [1], values6: [22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 120, 160], values5: [15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 135] },
  { stat: 'DEF flat', slots: [3], values6: [22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 120, 160], values5: [15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 135] },
  { stat: 'HP%', slots: [2, 4, 6], values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 63], values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51] },
  { stat: 'ATK%', slots: [2, 4, 6], values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 63], values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51] },
  { stat: 'DEF%', slots: [2, 4, 6], values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 63], values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51] },
  { stat: 'SPD', slots: [2], values6: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 42], values5: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 39] },
  { stat: 'CR', slots: [4], values6: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 58], values5: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 47] },
  { stat: 'CD', slots: [4], values6: [11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 80], values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 65] },
  { stat: 'RES', slots: [6], values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 64], values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51] },
  { stat: 'ACC', slots: [6], values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 64], values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51] },
]

// ---------------------------------------------------------------------------
// Section 6 — Roll Quality Tiers
// ---------------------------------------------------------------------------

interface RollQualityTier {
  tier: string
  symbol: string
  range: string
  color: string
  description: string
}

const ROLL_QUALITY_TIERS: RollQualityTier[] = [
  { tier: 'Legend', symbol: '★', range: '>= 90%', color: 'text-ga-roll-legend', description: 'Near-perfect rolls. Each roll averaged 90%+ of the maximum possible value.' },
  { tier: 'Hero', symbol: '●', range: '>= 75%', color: 'text-ga-roll-hero', description: 'Great rolls. Very usable rune, worth gemming and grinding.' },
  { tier: 'Rare', symbol: '◆', range: '>= 50%', color: 'text-ga-roll-rare', description: 'Average rolls. Usable for mid-game, might sell late-game.' },
  { tier: 'Magic', symbol: '○', range: '>= 25%', color: 'text-ga-roll-magic', description: 'Below average. Usually sell unless the substats are perfect for the build.' },
  { tier: 'Normal', symbol: '·', range: '< 25%', color: 'text-ga-roll-normal', description: 'Minimum or near-minimum rolls. Sell.' },
]

const rollQualityColumns: ColumnDef<RollQualityTier, unknown>[] = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }) => <Span className={`text-center text-lg block ${row.original.color}`}>{row.original.symbol}</Span>,
    enableSorting: false,
  },
  {
    accessorKey: 'tier',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Tier" />,
    cell: ({ row }) => <Span className={`font-medium ${row.original.color}`}>{row.original.tier}</Span>,
  },
  {
    accessorKey: 'range',
    header: 'Avg Roll %',
    cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.range}</Badge>,
    enableSorting: false,
  },
  {
    accessorKey: 'description',
    header: 'Meaning',
    cell: ({ row }) => <Span className="text-xs text-muted-foreground">{row.original.description}</Span>,
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Section 7 — Progressive Sell Guide
// ---------------------------------------------------------------------------

interface SellStep {
  level: string
  action: string
  details: string
  color: string
}

const SELL_GUIDE: SellStep[] = [
  { level: '+0', action: 'Check base subs & potential', details: 'The scanner evaluates POTENTIAL, not just current value. If the rune has 3-4 desired stats for an archetype, it gets an UPGRADE advice even with low current efficiency. Auto-sell if: flat main on 2/4/6, dead stat combos (ACC+RES together), or less than 2 useful subs for any archetype.', color: 'border-ga-tier-sell/30 bg-ga-tier-sell/5' },
  { level: '+3', action: 'First roll — potential check', details: 'If potential weighted efficiency >= threshold for your profile, keep upgrading. The system considers what the rune COULD become with good rolls and a gem, not just the current state. Early: >= 35, Mid: >= 45, Late: >= 55.', color: 'border-ga-roll-legend/30 bg-ga-roll-legend/5' },
  { level: '+6', action: 'Second roll — narrowing down', details: 'Potential narrows as rolls happen. If 2 rolls went into bad stats, even good base subs can\'t save it. Thresholds: Early: >= 40, Mid: >= 50, Late: >= 60. The system factors in gem potential (replacing worst sub).', color: 'border-warning/30 bg-warning/5' },
  { level: '+9', action: 'Third roll — last chance', details: 'Must have solid weighted efficiency. The scanner checks post-gem potential: if gemming the worst stat would push above threshold, advice is still UPGRADE. Thresholds: Early: >= 45, Mid: >= 55, Late: >= 65.', color: 'border-ga-roll-rare/30 bg-ga-roll-rare/5' },
  { level: '+12', action: 'Final verdict — grind or sell', details: 'Calculate final roll quality and weighted efficiency. If above threshold (Early: >= 50, Mid: >= 60, Late: >= 70), keep and grind. Otherwise sell. Mana is a resource too.', color: 'border-ga-roll-hero/30 bg-ga-roll-hero/5' },
]

// ---------------------------------------------------------------------------
// Section 8 — Roll Breakdown Symbols
// ---------------------------------------------------------------------------

interface RollSymbol {
  symbol: string
  tier: string
  range: string
  color: string
  example: string
}

const ROLL_SYMBOLS: RollSymbol[] = [
  { symbol: '★', tier: 'Legend', range: '95-100% of max', color: 'text-ga-roll-legend', example: 'SPD roll of 6 (max 6) = ★' },
  { symbol: '●', tier: 'Hero', range: '75-94% of max', color: 'text-ga-roll-hero', example: 'CD roll of 6 (max 7) = 86% ●' },
  { symbol: '◆', tier: 'Rare', range: '50-74% of max', color: 'text-ga-roll-rare', example: 'ATK% roll of 6 (max 8) = 75% ◆' },
  { symbol: '○', tier: 'Magic', range: '25-49% of max', color: 'text-ga-roll-magic', example: 'HP% roll of 5 (max 8) = 38% ○' },
  { symbol: '·', tier: 'Normal', range: '0-24% of max', color: 'text-ga-roll-normal', example: 'SPD roll of 4 (max 6) = 0% ·' },
]

const rollSymbolColumns: ColumnDef<RollSymbol, unknown>[] = [
  {
    accessorKey: 'symbol',
    header: 'Badge',
    cell: ({ row }) => <Span className={`text-center text-lg block ${row.original.color}`}>{row.original.symbol}</Span>,
    enableSorting: false,
  },
  {
    accessorKey: 'tier',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Tier" />,
    cell: ({ row }) => <Span className={`font-medium ${row.original.color}`}>{row.original.tier}</Span>,
  },
  {
    accessorKey: 'range',
    header: 'Range',
    cell: ({ row }) => <Span className="text-xs">{row.original.range}</Span>,
    enableSorting: false,
  },
  {
    accessorKey: 'example',
    header: 'Example',
    cell: ({ row }) => <Span className="text-xs text-muted-foreground">{row.original.example}</Span>,
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Section 9 — Gem/Grind Recommendations per Archetype
// ---------------------------------------------------------------------------

interface GemGrindRec {
  archetype: string
  emoji: string
  gemTarget: string
  gemReplace: string
  grindStats: string[]
  example: string
}

const GEM_GRIND_RECS: GemGrindRec[] = [
  { archetype: 'Speed DPS', emoji: '⚡', gemTarget: 'RES or ACC', gemReplace: 'SPD or CR', grindStats: ['ATK%', 'SPD', 'HP%'], example: 'Gem RES → SPD, grind ATK% + SPD' },
  { archetype: 'Bruiser', emoji: '💪', gemTarget: 'ACC or ATK flat', gemReplace: 'HP% or CR', grindStats: ['HP%', 'SPD', 'DEF%'], example: 'Gem ACC → HP%, grind HP% + SPD' },
  { archetype: 'Tank/Support', emoji: '🛡️', gemTarget: 'CR or CD', gemReplace: 'HP% or DEF%', grindStats: ['HP%', 'DEF%', 'SPD'], example: 'Gem CR → DEF%, grind HP% + DEF%' },
  { archetype: 'Cleave', emoji: '💀', gemTarget: 'RES or DEF%', gemReplace: 'ATK% or CD', grindStats: ['ATK%', 'SPD'], example: 'Gem RES → ATK%, grind ATK% + SPD' },
  { archetype: 'CC/Debuffer', emoji: '🎯', gemTarget: 'CR or CD', gemReplace: 'ACC or SPD', grindStats: ['HP%', 'DEF%', 'SPD'], example: 'Gem CD → ACC, grind HP% + SPD' },
  { archetype: 'Bomber', emoji: '💣', gemTarget: 'RES or DEF%', gemReplace: 'ATK% or ACC', grindStats: ['ATK%', 'SPD', 'HP%'], example: 'Gem DEF% → ATK%, grind ATK% + SPD' },
  { archetype: 'Strip/Cleanse', emoji: '✨', gemTarget: 'CR or CD', gemReplace: 'SPD or HP%', grindStats: ['HP%', 'SPD', 'DEF%'], example: 'Gem CR → HP%, grind HP% + SPD' },
  { archetype: 'Healer', emoji: '💚', gemTarget: 'CR or CD', gemReplace: 'HP% or SPD', grindStats: ['HP%', 'SPD', 'DEF%'], example: 'Gem CD → HP%, grind HP% + SPD' },
  { archetype: 'One-Shot', emoji: '🔫', gemTarget: 'RES or HP%', gemReplace: 'CR or CD', grindStats: ['ATK%', 'SPD'], example: 'Gem RES → CD, grind ATK% + SPD' },
  { archetype: 'DEF Nuker', emoji: '🏰', gemTarget: 'RES or ATK%', gemReplace: 'DEF% or CD', grindStats: ['DEF%', 'SPD'], example: 'Gem ATK% → DEF%, grind DEF% + SPD' },
  { archetype: 'Vamp Bruiser', emoji: '🧛', gemTarget: 'RES or ACC', gemReplace: 'CR or HP%', grindStats: ['ATK%', 'HP%', 'SPD'], example: 'Gem RES → HP%, grind ATK% + HP%' },
  { archetype: 'Revenge', emoji: '🔄', gemTarget: 'ATK% or ACC', gemReplace: 'HP% or DEF%', grindStats: ['HP%', 'DEF%', 'SPD'], example: 'Gem ATK% → HP%, grind HP% + DEF%' },
  { archetype: 'Speed Lead', emoji: '🏃', gemTarget: 'CR or CD', gemReplace: 'SPD or HP%', grindStats: ['HP%', 'DEF%', 'SPD'], example: 'Gem CD → HP%, grind HP% + SPD' },
  { archetype: 'Raid', emoji: '⚔️', gemTarget: 'CR or CD', gemReplace: 'HP% or RES', grindStats: ['HP%', 'DEF%', 'SPD'], example: 'Gem CD → RES, grind HP% + DEF% + SPD' },
]

const gemGrindColumns: ColumnDef<GemGrindRec, unknown>[] = [
  {
    accessorKey: 'archetype',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Archetype" />,
    cell: ({ row }) => (
      <Div className="flex items-center gap-1.5">
        <span>{row.original.emoji}</span>
        <span className="font-medium text-xs">{row.original.archetype}</span>
      </Div>
    ),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'gemTarget',
    header: 'Gem Target',
    cell: ({ row }) => <Badge variant="outline" className="text-xs border-destructive/40 text-destructive-foreground">{row.original.gemTarget}</Badge>,
    enableSorting: false,
  },
  {
    accessorKey: 'gemReplace',
    header: 'Gem With',
    cell: ({ row }) => <Badge variant="outline" className="text-xs border-success/40 text-success-foreground">{row.original.gemReplace}</Badge>,
    enableSorting: false,
  },
  {
    id: 'grindStats',
    accessorFn: (row) => row.grindStats.join(', '),
    header: 'Grind Stats',
    cell: ({ row }) => (
      <Div className="flex flex-wrap gap-1">
        {row.original.grindStats.map((s) => (
          <Badge key={s} variant="outline" className="text-xs border-ga-roll-rare/40 text-ga-roll-rare">{s}</Badge>
        ))}
      </Div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'example',
    header: 'Example',
    cell: ({ row }) => <Span className="text-xs text-muted-foreground font-mono">{row.original.example}</Span>,
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Section 10 — Sources
// ---------------------------------------------------------------------------

interface Source {
  name: string
  url: string
  description: string
}

const SOURCES: Source[] = [
  { name: 'SWARFARM', url: 'https://swarfarm.com', description: 'Community data mining — rune drop rates, monster stats, skill data.' },
  { name: 'Summoners War Wiki (Fandom)', url: 'https://summonerswar.fandom.com', description: 'Comprehensive wiki with rune mechanics, set bonuses, and upgrade formulas.' },
  { name: 'SW Optimizer (tool-106)', url: 'https://tool.swop.one', description: 'Rune optimizer — efficiency calculations and build planning.' },
  { name: 'Summoners War Subreddit', url: 'https://reddit.com/r/summonerswar', description: 'Community discussions, tier lists, and meta analysis.' },
]

// (no dynamic section system — sections are hardcoded in the JSX below)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameDataPage() {
  const params = useParams()
  const game = params.game as string

  if (game !== 'summoners-war') {
    return (
      <Div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <P className="text-2xl font-bold mb-4">Coming Soon</P>
        <P className="text-muted-foreground">
          Les données de référence pour {game.replace(/-/g, ' ')} sont en cours de préparation.
        </P>
      </Div>
    )
  }

  return (
    <Div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <Div className="mb-6">
        <P className="text-muted-foreground text-sm mt-1">
          All Summoners War rune reference tables, efficiency guides, and grindstone values in one place.
        </P>
      </Div>

      <Accordion type="multiple" defaultValue={['sets']} className="space-y-2">

        {/* ---- 1. Rune Sets ---- */}
        <AccordionItem value="sets">
          <AccordionTrigger className="text-base font-semibold">1. Rune Sets</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                Complete overview of every rune set: bonus, <TT tip="S-tier sets have the best bonuses. Weaker sets need godlike substats to be worth keeping.">set strength</TT>, and <TT tip="Tier list of stats per set. S=priority, D=useless. Used to weight efficiency per set.">stat tiers</TT>.
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
                    {(Object.entries(TIER_WEIGHTS) as [StatTier, number][]).map(([tier, weight]) => (
                      <Div key={tier} className="flex items-center gap-1.5">
                        <Span className={`text-sm ${TIER_COLOR[tier]}`}>{tier}</Span>
                        <Span className="text-xs text-muted-foreground">= {weight}</Span>
                      </Div>
                    ))}
                  </Div>
                  <P className="text-xs text-muted-foreground mt-2">
                    Multiplier applied to each substat&apos;s efficiency based on its tier for this set. A SPD substat tier S on Violent counts at 100%, but RES tier C only counts at 20%.
                  </P>
                </CardContent>
              </Card>

              <P className="text-xs text-muted-foreground italic">
                Legend: <Span className="text-ga-tier-s font-bold">S</Span> priority, <Span className="text-ga-tier-a font-semibold">A</Span> important, <Span className="text-ga-tier-b">B</Span> useful, <Span className="text-ga-tier-c">C</Span> mediocre, <Span className="text-ga-tier-d">D</Span> useless. Str = Set Strength (how valuable the set bonus itself is).
              </P>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 2. Substat Values ---- */}
        <AccordionItem value="substat-values">
          <AccordionTrigger className="text-base font-semibold">2. Substat Values</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                Roll ranges (6-star), <TT tip="Grindstones add a flat bonus to a substat. Only grindable: HP, HP%, ATK, ATK%, DEF, DEF%, SPD.">grindstone</TT> values, and <TT tip="Enchanted gems replace one substat entirely with a new value. Unlike grinds, gems can target ANY stat.">enchanted gem</TT> values at a glance. &quot;-&quot; means the stat cannot be grinded.
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
          <AccordionTrigger className="text-base font-semibold">3. Build Archetypes (Advanced)</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <Card size="sm" className="border-muted-foreground/20 bg-muted/10">
                <CardContent className="pt-3">
                  <P className="text-xs text-muted-foreground">
                    These are supplementary — the main analysis is set-based. Archetypes are provided as extra context for advanced users.
                  </P>
                </CardContent>
              </Card>

              <P className="text-xs text-muted-foreground">
                Stat priorities and <TT tip="Numerical weights (0.05 to 1.0) that determine how much each stat contributes to the weighted efficiency score for a given archetype.">numerical weights</TT> per build archetype.
              </P>

              <Div className="overflow-x-auto">
                <Table variant="striped" size="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Archetype</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[280px]">Stat Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ARCHETYPES.map((a) => (
                      <TableRow key={a.name}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{a.description}</TableCell>
                        <TableCell>
                          <Div className="flex flex-wrap gap-1">
                            {a.stats.map((s) => (
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
                  <TT tip="These weights determine the weighted efficiency score. A weight of 1.0 means the stat is top priority; 0.05 means nearly useless.">Stat Priority Weights</TT>
                </P>
                <Div className="overflow-x-auto">
                  <Table size="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] sticky left-0 bg-background z-10">Archetype</TableHead>
                        {ALL_STATS.map((s) => (
                          <TableHead key={s} className="text-center w-[52px] text-xs">{s}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {WEIGHT_ROWS.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Div className="flex items-center gap-1.5 cursor-help">
                                  <span>{row.emoji}</span>
                                  <span className="font-medium text-xs">{row.archetype}</span>
                                </Div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px]">
                                {row.description}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          {ALL_STATS.map((s) => (
                            <TableCell key={s} className={`text-center tabular-nums text-xs ${weightColor(row.weights[s] ?? 0)}`}>
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
                Color coding: <span className="text-ga-roll-legend font-bold">1.0-0.9</span> top priority, <span className="text-ga-roll-hero font-semibold">0.7-0.89</span> high, <span className="text-ga-roll-rare">0.5-0.69</span> medium, <span className="text-ga-roll-magic">0.3-0.49</span> low, <span className="text-ga-roll-normal">below 0.3</span> useless.
              </P>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 4. Roll Quality Tiers ---- */}
        <AccordionItem value="roll-quality">
          <AccordionTrigger className="text-base font-semibold">4. <TT tip="The average quality of each roll compared to the maximum possible value for that stat.">Roll Quality</TT> Tiers</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                <TT tip="The average quality of each roll compared to the maximum possible value for that stat.">Roll Quality</TT> measures how close each substat roll landed to the maximum possible value. It replaces the old efficiency threshold system with a more intuitive tier system.
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
                    Current vs <TT tip="The quality tier if the worst substat (for the best matching archetype) is replaced by a legend enchanted gem. Shows the rune's true potential.">Post-Gem</TT>
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The scanner shows two quality tiers: <strong>Current</strong> (what the rune has now) and <strong>Post-Gem</strong> (what it could become if you gem the worst substat for the best archetype). A rune with &quot;Rare → Hero&quot; means it&apos;s currently Rare quality but could reach Hero with a gem. This is used by the <TT tip="The advice considers both current quality and gem potential to determine whether to upgrade, keep, or sell.">Progressive Advice</TT> to decide if the rune is worth investing in.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-primary/20 bg-primary/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="The standard Summoners War efficiency formula used by all optimizers. Named after the player Barion who popularized it.">Barion Efficiency</TT> (Raw Efficiency)
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The raw efficiency formula: <span className="font-mono">sum(substat_value / max_roll_value) / TOTAL_EVENTS * 100</span>. For each substat, the ratio is <span className="font-mono">current_value / (max_single_roll * number_of_rolls_into_that_stat)</span>. TOTAL_EVENTS = 8 for a 6-star rune at +12 (initial 4 subs + 4 power-up rolls). This gives a 0-100 score where 100 means every roll was max.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a +12 rune with SPD 18 (3 rolls max = 18), CR 12 (2 rolls max = 12), HP% 8 (1 roll max = 8), DEF% 13 (2 rolls max = 16). Ratios: 18/18 + 12/12 + 8/8 + 13/16 = 1 + 1 + 1 + 0.81 = 3.81. Efficiency = 3.81/8 * 100 = <strong>47.6%</strong>.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-ga-roll-hero/20 bg-ga-roll-hero/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="Projects what Barion efficiency the rune would reach at +12 if all remaining rolls go into the max value.">Potential +12</TT>
                  </P>
                  <P className="text-xs text-muted-foreground">
                    For runes not yet at +12, the scanner calculates what the efficiency WOULD be if all remaining power-up rolls landed at max value. Formula: <span className="font-mono">current_efficiency + (remaining_rolls * max_single_roll_ratio / TOTAL_EVENTS * 100)</span>. A +6 rune has 2 rolls left, so potential adds up to 2 max-roll ratios.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a +6 rune with current efficiency 25% has 2 remaining rolls. Best case each roll = 1.0 ratio, so potential = 25 + (2 * 1.0/8 * 100) = 25 + 25 = <strong>50%</strong>. This is used by the progressive advice to decide if the rune is worth upgrading further.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-ga-roll-legend/20 bg-ga-roll-legend/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="Efficiency score after applying maximum legend grindstones to all grindable substats. Shows the rune's ceiling after optimization.">After Grind</TT> Efficiency
                  </P>
                  <P className="text-xs text-muted-foreground">
                    After calculating potential +12, the scanner adds the value of legend grindstones to all grindable substats (HP, HP%, ATK, ATK%, DEF, DEF%, SPD). Formula: <span className="font-mono">potential_efficiency + sum(legend_grind_max / max_roll_value) / TOTAL_EVENTS * 100</span> for each grindable stat present.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a rune at potential 50% with SPD (grind +5) and HP% (grind +10%). Grind gain = (5/6 + 10/8) / 8 * 100 = (0.83 + 1.25) / 8 * 100 = <strong>+26%</strong>. After Grind = 50 + 26 = <strong>76%</strong>. This is the rune&apos;s realistic ceiling.
                  </P>
                </CardContent>
              </Card>

              <Card size="sm" className="border-ga-roll-rare/20 bg-ga-roll-rare/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="The final weighted efficiency after applying the best gem (replacing worst sub) and all grinds. Accounts for lost rolls in the replaced stat.">Post-Optim Score</TT>
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The post-optimization score is the weighted efficiency after applying both the best enchanted gem AND all legend grinds. Unlike raw After Grind, this uses <strong>weighted</strong> efficiency (stat importance matters) and accounts for the fact that gemming replaces a substat — including any rolls that went into the replaced stat (lost rolls).
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    Example: a Violent rune for a Bruiser with RES 12% (3 rolls). Gemming RES → HP% removes 3 bad rolls but adds a legend gem value (7-11% HP%). The post-optim score recalculates weighted efficiency with the new substat, re-applies grinds, and gives the <strong>true final score</strong> used to rank runes.
                  </P>
                </CardContent>
              </Card>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- 5. Progressive Sell Guide ---- */}
        <AccordionItem value="sell-guide">
          <AccordionTrigger className="text-base font-semibold">5. <TT tip="The advice considers both current quality AND gem/grind potential, not just the current efficiency number.">Progressive Sell Guide</TT></AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground mb-2">
                The progressive system evaluates runes at each power-up milestone. Unlike static thresholds, it considers what the rune COULD become (potential) — not just its current state. If the potential weighted efficiency after gemming exceeds the threshold, the advice is UPGRADE even if current efficiency looks low.
              </P>

              <Card size="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <TT tip="Minimum weighted efficiency required at each level to keep upgrading. Below this = sell.">Weighted Efficiency Thresholds</TT> by Profile
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
                    Runes with <strong>ACC + RES</strong> together are auto-sell. No monster needs both stats — this combination means the rune has no viable archetype.
                  </P>
                </CardContent>
              </Card>

              <Div className="space-y-3">
                {SELL_GUIDE.map((step) => (
                  <Card key={step.level} size="xs" className={`border ${step.color}`}>
                    <CardContent className="pt-3">
                      <Div className="flex items-start gap-3">
                        <Badge variant="outline" className="font-mono text-xs shrink-0 mt-0.5">{step.level}</Badge>
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
                  {SLOTS.map((s) => (
                    <Card key={s.slot} size="sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Slot {s.slot}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">?</Badge>
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
                            <Badge variant="secondary" className="text-xs">{s.mainFixed} (fixed)</Badge>
                          ) : (
                            <Div className="flex flex-wrap gap-1">
                              {s.mainOptions.map((opt) => (
                                <Badge key={opt} variant="outline" className="text-xs">{opt}</Badge>
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
                  {MAIN_STATS.map((ms) => (
                    <Div key={ms.stat}>
                      <P className="font-medium text-sm mb-2">
                        {ms.stat} <span className="text-muted-foreground text-xs">(Slots {ms.slots.join(', ')})</span>
                      </P>
                      <Div className="overflow-x-auto">
                        <Table size="compact">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px]">Grade</TableHead>
                              {Array.from({ length: 16 }, (_, i) => (
                                <TableHead key={i} className="text-center w-[46px] text-xs">+{i}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-xs">6-star</TableCell>
                              {ms.values6.map((v, i) => (
                                <TableCell key={i} className="text-center tabular-nums text-xs">{v}</TableCell>
                              ))}
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-xs text-muted-foreground">5-star</TableCell>
                              {ms.values5.map((v, i) => (
                                <TableCell key={i} className="text-center tabular-nums text-xs text-muted-foreground">{v}</TableCell>
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
                <P className="font-bold text-sm mb-3"><TT tip="Each individual substat roll is graded from Legend to Normal based on how close it landed to the maximum possible value.">Roll Breakdown</TT> Symbols</P>
                <Div className="space-y-4">
                  <P className="text-xs text-muted-foreground">
                    Each individual roll into a substat is graded based on how close it landed to the maximum. The badges appear next to each substat in the rune card.
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
                        Example: <span className="font-mono">SPD +18 (★●◆)</span> means 3 rolls into SPD. First roll was Legend (max), second Hero, third Rare. The overall quality for that substat is the average of all individual rolls.
                      </P>
                      <P className="text-xs text-muted-foreground mt-1">
                        Roll quality is calculated as: <span className="font-mono">(value - min) / (max - min)</span> for each roll. A roll of 6 on SPD (range 4-6) = <span className="font-mono">(6-4)/(6-4) = 100%</span> = Legend.
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
          <AccordionTrigger className="text-base font-semibold">7. <TT tip="Which stat to gem (replace the worst substat) and which stats to grind (add flat bonus) for each archetype.">Gem/Grind Recommendations</TT> by Archetype (Advanced)</AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <Card size="sm" className="border-muted-foreground/20 bg-muted/10">
                <CardContent className="pt-3">
                  <P className="text-xs text-muted-foreground">
                    These are supplementary — the main gem target logic is now set-based. Archetype-specific recommendations are provided as extra context.
                  </P>
                </CardContent>
              </Card>

              <P className="text-xs text-muted-foreground">
                For each archetype, typical gem targets and grind priorities.
              </P>

              <Card size="sm" className="border-warning/20 bg-warning/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">
                    <TT tip="The priority order used by the scanner to decide which substat to replace with an enchanted gem.">Gem Target Logic</TT> — Priority Order
                  </P>
                  <P className="text-xs text-muted-foreground">
                    The scanner picks the gem target using this priority: <strong>1) Dead stats</strong> (ACC on a DPS, RES on a bomber) → <strong>2) Flat stats</strong> (ATK flat, DEF flat, HP flat — almost always worse than %) → <strong>3) Lowest weight stat</strong> for the set. The gem replacement is the highest-weight stat not already on the rune.
                  </P>
                  <P className="text-xs text-muted-foreground mt-1">
                    <strong>Never gem out:</strong> SPD, CR, or CD — these are universally valuable and the scanner will never recommend replacing them.
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
              {SOURCES.map((s) => (
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
                      <Badge variant="outline" className="text-xs shrink-0">Link</Badge>
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
