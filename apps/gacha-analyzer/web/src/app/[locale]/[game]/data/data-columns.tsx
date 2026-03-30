'use client'

import {
  Badge,
  DataTableColumnHeader,
  Div,
  Span,
  type ColumnDef,
  type SortingState,
} from '@ezstart/ui/components'

import type { StatTier } from '@gacha-analyzer/types'

import {
  TIER_COLOR,
  TIER_STATS,
  TIER_STAT_LABELS,
  RANK_COLORS,
  tierSortFn,
  type RuneSetRow,
  type SubstatValueRow,
  type RollQualityTier,
  type RollSymbol,
  type GemGrindRec,
} from './data-constants'

// ---------------------------------------------------------------------------
// Tooltip helper — wraps a term with a tooltip explanation
// ---------------------------------------------------------------------------

import { Tooltip, TooltipContent, TooltipTrigger } from '@ezstart/ui/components'

export function TT({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Span className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 cursor-help">
          {children}
        </Span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

export function RankBadge({ stat, rank }: { stat: string; rank: number }) {
  return (
    <Badge variant="outline" className={`text-xs border ${RANK_COLORS[rank] ?? RANK_COLORS[5]}`}>
      {stat}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Rune Set Columns
// ---------------------------------------------------------------------------

export const runeSetColumns: ColumnDef<RuneSetRow, unknown>[] = [
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
                {pieces ? `${pieces}pcs` : ''}
                {pieces && bonus ? ' — ' : ''}
                {bonus ?? ''}
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
    header: ({ header }) => (
      <DataTableColumnHeader header={header} title="Str" className="justify-center" />
    ),
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
  ...TIER_STATS.map(
    (stat): ColumnDef<RuneSetRow, unknown> => ({
      id: `tier_${stat}`,
      accessorFn: row => row.tiers[stat],
      header: ({ header }) => (
        <DataTableColumnHeader
          header={header}
          title={TIER_STAT_LABELS[stat]!}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const tier = row.original.tiers[stat] as StatTier | undefined
        return (
          <Span
            className={`text-center tabular-nums text-xs block ${tier ? TIER_COLOR[tier] : ''}`}
          >
            {tier ?? '-'}
          </Span>
        )
      },
      sortingFn: (rowA, rowB) => tierSortFn(rowA.original.tiers[stat], rowB.original.tiers[stat]),
    })
  ),
]

export const INITIAL_SET_SORTING: SortingState = [{ id: 'strength', desc: false }]

// ---------------------------------------------------------------------------
// Substat Columns
// ---------------------------------------------------------------------------

export const substatColumns: ColumnDef<SubstatValueRow, unknown>[] = [
  {
    accessorKey: 'stat',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Stat" />,
    cell: ({ row }) => <Span className="font-medium text-xs">{row.original.stat}</Span>,
  },
  {
    accessorKey: 'min',
    header: ({ header }) => (
      <DataTableColumnHeader header={header} title="Min Roll" className="justify-center" />
    ),
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">
        {row.original.min}
        {row.original.unit}
      </Span>
    ),
  },
  {
    accessorKey: 'max',
    header: ({ header }) => (
      <DataTableColumnHeader header={header} title="Max Roll" className="justify-center" />
    ),
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">
        {row.original.max}
        {row.original.unit}
      </Span>
    ),
  },
  {
    id: 'grind_magic',
    accessorFn: row => row.grind.magic,
    header: 'Grind Mag',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.grind.magic}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'grind_rare',
    accessorFn: row => row.grind.rare,
    header: 'Grind Rare',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.grind.rare}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'grind_hero',
    accessorFn: row => row.grind.hero,
    header: 'Grind Hero',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.grind.hero}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'grind_legend',
    accessorFn: row => row.grind.legend,
    header: 'Grind Leg',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.grind.legend}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'gem_magic',
    accessorFn: row => row.gem.magic,
    header: 'Gem Mag',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.gem.magic}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'gem_rare',
    accessorFn: row => row.gem.rare,
    header: 'Gem Rare',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.gem.rare}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'gem_hero',
    accessorFn: row => row.gem.hero,
    header: 'Gem Hero',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.gem.hero}</Span>
    ),
    enableSorting: false,
  },
  {
    id: 'gem_legend',
    accessorFn: row => row.gem.legend,
    header: 'Gem Leg',
    cell: ({ row }) => (
      <Span className="text-center tabular-nums text-xs block">{row.original.gem.legend}</Span>
    ),
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Roll Quality Columns
// ---------------------------------------------------------------------------

export const rollQualityColumns: ColumnDef<RollQualityTier, unknown>[] = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }) => (
      <Span className={`text-center text-lg block ${row.original.color}`}>
        {row.original.symbol}
      </Span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'tier',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Tier" />,
    cell: ({ row }) => (
      <Span className={`font-medium ${row.original.color}`}>{row.original.tier}</Span>
    ),
  },
  {
    accessorKey: 'range',
    header: 'Avg Roll %',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.range}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'description',
    header: 'Meaning',
    cell: ({ row }) => (
      <Span className="text-xs text-muted-foreground">{row.original.description}</Span>
    ),
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Roll Symbol Columns
// ---------------------------------------------------------------------------

export const rollSymbolColumns: ColumnDef<RollSymbol, unknown>[] = [
  {
    accessorKey: 'symbol',
    header: 'Badge',
    cell: ({ row }) => (
      <Span className={`text-center text-lg block ${row.original.color}`}>
        {row.original.symbol}
      </Span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'tier',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Tier" />,
    cell: ({ row }) => (
      <Span className={`font-medium ${row.original.color}`}>{row.original.tier}</Span>
    ),
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
    cell: ({ row }) => (
      <Span className="text-xs text-muted-foreground">{row.original.example}</Span>
    ),
    enableSorting: false,
  },
]

// ---------------------------------------------------------------------------
// Gem/Grind Recommendation Columns
// ---------------------------------------------------------------------------

export const gemGrindColumns: ColumnDef<GemGrindRec, unknown>[] = [
  {
    accessorKey: 'archetype',
    header: ({ header }) => <DataTableColumnHeader header={header} title="Archetype" />,
    cell: ({ row }) => (
      <Div className="flex items-center gap-1.5">
        <Span>{row.original.emoji}</Span>
        <Span className="font-medium text-xs">{row.original.archetype}</Span>
      </Div>
    ),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'gemTarget',
    header: 'Gem Target',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-xs border-destructive/40 text-destructive-foreground"
      >
        {row.original.gemTarget}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'gemReplace',
    header: 'Gem With',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs border-success/40 text-success-foreground">
        {row.original.gemReplace}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    id: 'grindStats',
    accessorFn: row => row.grindStats.join(', '),
    header: 'Grind Stats',
    cell: ({ row }) => (
      <Div className="flex flex-wrap gap-1">
        {row.original.grindStats.map(s => (
          <Badge
            key={s}
            variant="outline"
            className="text-xs border-ga-roll-rare/40 text-ga-roll-rare"
          >
            {s}
          </Badge>
        ))}
      </Div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'example',
    header: 'Example',
    cell: ({ row }) => (
      <Span className="text-xs text-muted-foreground font-mono">{row.original.example}</Span>
    ),
    enableSorting: false,
  },
]
