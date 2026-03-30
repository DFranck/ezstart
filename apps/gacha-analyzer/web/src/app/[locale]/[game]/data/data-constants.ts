import {
  SET_STAT_TIERS,
  TIER_WEIGHTS,
  SET_STRENGTH,
  SET_ARCHETYPE_AFFINITY,
  BUILD_ARCHETYPES,
  STAT_PRIORITY_WEIGHTS,
  RUNE_SET_INFO,
} from '@gacha-analyzer/types'
import type { StatTier, BuildArchetype } from '@gacha-analyzer/types'

import { RUNE_SET_ICONS } from '@/config/game-assets'

// ---------------------------------------------------------------------------
// Shared constants & helpers
// ---------------------------------------------------------------------------

export const RANK_COLORS: Record<number, string> = {
  1: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/40',
  2: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/40',
  3: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  4: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/40',
  5: 'bg-ga-roll-normal/20 text-ga-roll-normal border-ga-roll-normal/40',
}

export const TIER_COLOR: Record<StatTier, string> = {
  S: 'text-ga-tier-s font-bold',
  A: 'text-ga-tier-a font-semibold',
  B: 'text-ga-tier-b',
  C: 'text-ga-tier-c',
  D: 'text-ga-tier-d',
}

export const TIER_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }

export const TIER_STATS = [
  'spd',
  'cr',
  'cd',
  'atk%',
  'hp%',
  'def%',
  'acc',
  'res',
  'hp',
  'atk',
  'def',
] as const

export const TIER_STAT_LABELS: Record<string, string> = {
  spd: 'SPD',
  cr: 'CR',
  cd: 'CD',
  'atk%': 'ATK%',
  'hp%': 'HP%',
  'def%': 'DEF%',
  acc: 'ACC',
  res: 'RES',
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
}

// Radar chart only shows % and rate stats (not flat hp/atk/def)
export const RADAR_STATS = ['spd', 'cr', 'cd', 'atk%', 'hp%', 'def%', 'acc', 'res'] as const

export const ALL_STATS = [
  'SPD',
  'CR',
  'CD',
  'ATK%',
  'HP%',
  'DEF%',
  'ACC',
  'RES',
  'ATK',
  'DEF',
  'HP',
]

export function weightColor(w: number): string {
  if (w >= 0.9) return 'text-ga-roll-legend font-bold'
  if (w >= 0.7) return 'text-ga-roll-hero font-semibold'
  if (w >= 0.5) return 'text-ga-roll-rare'
  if (w >= 0.3) return 'text-ga-roll-magic'
  return 'text-ga-roll-normal'
}

export function tierSortFn(a: string | undefined, b: string | undefined): number {
  return (TIER_ORDER[b ?? ''] ?? 0) - (TIER_ORDER[a ?? ''] ?? 0)
}

// ---------------------------------------------------------------------------
// Section 1 — Rune Sets data
// ---------------------------------------------------------------------------

export const SET_KEYS = Object.keys(SET_STAT_TIERS)

export interface RuneSetRow {
  setKey: string
  strength: StatTier | undefined
  pieces: number | undefined
  bonus: string | undefined
  icon: string | undefined
  archetypes: string[]
  tiers: Record<string, StatTier>
}

export const RUNE_SET_DATA: RuneSetRow[] = SET_KEYS.map(setKey => {
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

// ---------------------------------------------------------------------------
// Section 2 — Build Archetypes
// ---------------------------------------------------------------------------

export type StatPriority = { stat: string; rank: number }

export interface Archetype {
  name: string
  description: string
  stats: StatPriority[]
}

export const ARCHETYPES: Archetype[] = [
  {
    name: 'Swift Attacker',
    description: 'Speed-scaling nuker (Lushen, Kaki)',
    stats: [
      { stat: 'SPD', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'ATK%', rank: 4 },
    ],
  },
  {
    name: 'Slow Cleave',
    description: 'Shield/Will nuker (Tiana comps)',
    stats: [
      { stat: 'ATK%', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'SPD', rank: 4 },
    ],
  },
  {
    name: 'Bruiser',
    description: 'Tanky DPS (Perna, Mo Long)',
    stats: [
      { stat: 'HP%', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'SPD', rank: 4 },
      { stat: 'ATK%', rank: 5 },
    ],
  },
  {
    name: 'Speed Support',
    description: 'Turn 1 support (Bernard, Megan)',
    stats: [
      { stat: 'SPD', rank: 1 },
      { stat: 'HP%', rank: 2 },
      { stat: 'DEF%', rank: 3 },
      { stat: 'ACC', rank: 4 },
    ],
  },
  {
    name: 'Tank Support',
    description: 'Healer / buffer (Fran, Riley)',
    stats: [
      { stat: 'HP%', rank: 1 },
      { stat: 'SPD', rank: 2 },
      { stat: 'DEF%', rank: 3 },
      { stat: 'RES', rank: 4 },
    ],
  },
  {
    name: 'CC / Debuffer',
    description: 'Control (Poseidon, Hathor)',
    stats: [
      { stat: 'SPD', rank: 1 },
      { stat: 'ACC', rank: 2 },
      { stat: 'HP%', rank: 3 },
      { stat: 'DEF%', rank: 4 },
    ],
  },
  {
    name: 'Bomb',
    description: 'Bomber (Seara, Malaka)',
    stats: [
      { stat: 'ATK%', rank: 1 },
      { stat: 'SPD', rank: 2 },
      { stat: 'ACC', rank: 3 },
      { stat: 'HP%', rank: 4 },
    ],
  },
  {
    name: 'Raid DD',
    description: 'R5 damage dealer (Kro, Baleygr)',
    stats: [
      { stat: 'CD', rank: 1 },
      { stat: 'ATK%', rank: 2 },
      { stat: 'CR', rank: 3 },
      { stat: 'SPD', rank: 4 },
      { stat: 'RES', rank: 5 },
    ],
  },
  {
    name: 'Raid FL',
    description: 'R5 frontline (Darion, Dias)',
    stats: [
      { stat: 'HP%', rank: 1 },
      { stat: 'DEF%', rank: 2 },
      { stat: 'RES', rank: 3 },
      { stat: 'SPD', rank: 4 },
      { stat: 'ACC', rank: 5 },
    ],
  },
  {
    name: 'Speed DB/GB',
    description: 'Dungeon speed team',
    stats: [
      { stat: 'SPD', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'ATK%', rank: 4 },
      { stat: 'ACC', rank: 5 },
    ],
  },
  {
    name: 'Def Scaler',
    description: 'DEF-based DD (Copper, Bulldozer)',
    stats: [
      { stat: 'DEF%', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'SPD', rank: 4 },
    ],
  },
  {
    name: 'HP Scaler',
    description: 'HP-based DD (Rina, Arnold)',
    stats: [
      { stat: 'HP%', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'SPD', rank: 4 },
      { stat: 'DEF%', rank: 5 },
    ],
  },
  {
    name: 'Vampire DD',
    description: 'Self-sustain DPS (Trevor, Laika)',
    stats: [
      { stat: 'ATK%', rank: 1 },
      { stat: 'CR', rank: 2 },
      { stat: 'CD', rank: 3 },
      { stat: 'SPD', rank: 4 },
      { stat: 'HP%', rank: 5 },
    ],
  },
  {
    name: 'Pure Tank',
    description: 'Wall / stall (Rina, Praha)',
    stats: [
      { stat: 'HP%', rank: 1 },
      { stat: 'DEF%', rank: 2 },
      { stat: 'SPD', rank: 3 },
      { stat: 'RES', rank: 4 },
    ],
  },
]

// Stat priority weights table data (from @gacha-analyzer/types STAT_PRIORITY_WEIGHTS)
export interface WeightRow {
  archetype: string
  key: BuildArchetype
  emoji: string
  description: string
  weights: Record<string, number>
}

export const WEIGHT_ROWS: WeightRow[] = (
  Object.entries(BUILD_ARCHETYPES) as [
    BuildArchetype,
    { name: string; emoji: string; description: string },
  ][]
).map(([key, info]) => {
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

export interface SlotInfo {
  slot: number
  mainFixed: string | null
  mainOptions: string[]
  priority: string[]
  tip: string
}

export const SLOTS: SlotInfo[] = [
  {
    slot: 1,
    mainFixed: 'ATK flat',
    mainOptions: [],
    priority: ['SPD', 'CR', 'CD', 'ATK%'],
    tip: 'Main stat always ATK flat. Focus on damage substats for DDs or SPD/HP% for supports.',
  },
  {
    slot: 2,
    mainFixed: null,
    mainOptions: ['SPD', 'ATK%', 'DEF%', 'HP%', 'ATK flat', 'DEF flat', 'HP flat'],
    priority: ['SPD', 'CR', 'CD', 'HP%', 'ATK%'],
    tip: 'SPD is the most desired main stat. ATK%/HP%/DEF% for slower builds. Flat main stats are trash.',
  },
  {
    slot: 3,
    mainFixed: 'DEF flat',
    mainOptions: [],
    priority: ['SPD', 'CR', 'CD', 'HP%', 'ATK%'],
    tip: 'Main stat always DEF flat. Same substat priorities as slot 1.',
  },
  {
    slot: 4,
    mainFixed: null,
    mainOptions: ['CR', 'CD', 'ATK%', 'DEF%', 'HP%', 'ATK flat', 'DEF flat', 'HP flat'],
    priority: ['SPD', 'CR', 'CD', 'ATK%', 'HP%'],
    tip: 'CR/CD for damage dealers. HP%/DEF% for tanks. CR slot 4 is king for early game.',
  },
  {
    slot: 5,
    mainFixed: 'HP flat',
    mainOptions: [],
    priority: ['SPD', 'CR', 'CD', 'ATK%', 'HP%'],
    tip: 'Main stat always HP flat. Like slots 1/3, focus on good substats.',
  },
  {
    slot: 6,
    mainFixed: null,
    mainOptions: ['ATK%', 'DEF%', 'HP%', 'ACC', 'RES', 'ATK flat', 'DEF flat', 'HP flat'],
    priority: ['SPD', 'HP%', 'ATK%', 'ACC', 'CR'],
    tip: 'ATK% for DDs, HP% for tanks, ACC for debuffers. RES for raid. Most versatile slot.',
  },
]

// ---------------------------------------------------------------------------
// Section 4 — Substat Values
// ---------------------------------------------------------------------------

export interface SubstatValueRow {
  stat: string
  min: number
  max: number
  unit: string
  grind: { magic: string; rare: string; hero: string; legend: string }
  gem: { magic: string; rare: string; hero: string; legend: string }
}

export const SUBSTAT_VALUES: SubstatValueRow[] = [
  {
    stat: 'HP flat',
    min: 135,
    max: 375,
    unit: '',
    grind: { magic: '100-200', rare: '180-250', hero: '230-450', legend: '430-550' },
    gem: { magic: '100-200', rare: '180-280', hero: '250-420', legend: '400-580' },
  },
  {
    stat: 'HP%',
    min: 5,
    max: 8,
    unit: '%',
    grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' },
    gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' },
  },
  {
    stat: 'ATK flat',
    min: 10,
    max: 20,
    unit: '',
    grind: { magic: '6-12', rare: '10-18', hero: '12-22', legend: '18-30' },
    gem: { magic: '8-12', rare: '10-16', hero: '15-23', legend: '20-30' },
  },
  {
    stat: 'ATK%',
    min: 5,
    max: 8,
    unit: '%',
    grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' },
    gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' },
  },
  {
    stat: 'DEF flat',
    min: 10,
    max: 20,
    unit: '',
    grind: { magic: '6-12', rare: '10-18', hero: '12-22', legend: '18-30' },
    gem: { magic: '8-12', rare: '10-16', hero: '15-23', legend: '20-30' },
  },
  {
    stat: 'DEF%',
    min: 5,
    max: 8,
    unit: '%',
    grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' },
    gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' },
  },
  {
    stat: 'SPD',
    min: 4,
    max: 6,
    unit: '',
    grind: { magic: '1-2', rare: '2-3', hero: '3-4', legend: '4-5' },
    gem: { magic: '1-3', rare: '2-4', hero: '3-6', legend: '5-8' },
  },
  {
    stat: 'CR',
    min: 4,
    max: 6,
    unit: '%',
    grind: { magic: '-', rare: '-', hero: '-', legend: '-' },
    gem: { magic: '2-3%', rare: '3-5%', hero: '4-6%', legend: '5-8%' },
  },
  {
    stat: 'CD',
    min: 4,
    max: 7,
    unit: '%',
    grind: { magic: '-', rare: '-', hero: '-', legend: '-' },
    gem: { magic: '2-4%', rare: '3-5%', hero: '4-7%', legend: '5-9%' },
  },
  {
    stat: 'RES',
    min: 4,
    max: 8,
    unit: '%',
    grind: { magic: '-', rare: '-', hero: '-', legend: '-' },
    gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' },
  },
  {
    stat: 'ACC',
    min: 4,
    max: 8,
    unit: '%',
    grind: { magic: '-', rare: '-', hero: '-', legend: '-' },
    gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' },
  },
]

// ---------------------------------------------------------------------------
// Section 5 — Main Stat Values (+0 to +15)
// ---------------------------------------------------------------------------

export interface MainStatTable {
  stat: string
  slots: number[]
  values6: number[]
  values5: number[]
}

export const MAIN_STATS: MainStatTable[] = [
  {
    stat: 'HP flat',
    slots: [5],
    values6: [
      360, 435, 510, 585, 660, 735, 810, 885, 960, 1035, 1110, 1185, 1260, 1335, 1410, 1485,
    ],
    values5: [270, 333, 396, 459, 522, 585, 648, 711, 774, 837, 900, 963, 1026, 1089, 1152, 1215],
  },
  {
    stat: 'ATK flat',
    slots: [1],
    values6: [22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 120, 160],
    values5: [15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 135],
  },
  {
    stat: 'DEF flat',
    slots: [3],
    values6: [22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 120, 160],
    values5: [15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92, 99, 106, 113, 135],
  },
  {
    stat: 'HP%',
    slots: [2, 4, 6],
    values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 63],
    values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51],
  },
  {
    stat: 'ATK%',
    slots: [2, 4, 6],
    values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 63],
    values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51],
  },
  {
    stat: 'DEF%',
    slots: [2, 4, 6],
    values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 63],
    values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51],
  },
  {
    stat: 'SPD',
    slots: [2],
    values6: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 42],
    values5: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 39],
  },
  {
    stat: 'CR',
    slots: [4],
    values6: [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 58],
    values5: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 47],
  },
  {
    stat: 'CD',
    slots: [4],
    values6: [11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 80],
    values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 65],
  },
  {
    stat: 'RES',
    slots: [6],
    values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 64],
    values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51],
  },
  {
    stat: 'ACC',
    slots: [6],
    values6: [11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 64],
    values5: [8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 51],
  },
]

// ---------------------------------------------------------------------------
// Section 6 — Roll Quality Tiers
// ---------------------------------------------------------------------------

export interface RollQualityTier {
  tier: string
  symbol: string
  range: string
  color: string
  description: string
}

export const ROLL_QUALITY_TIERS: RollQualityTier[] = [
  {
    tier: 'Legend',
    symbol: '★',
    range: '>= 90%',
    color: 'text-ga-roll-legend',
    description: 'Near-perfect rolls. Each roll averaged 90%+ of the maximum possible value.',
  },
  {
    tier: 'Hero',
    symbol: '●',
    range: '>= 75%',
    color: 'text-ga-roll-hero',
    description: 'Great rolls. Very usable rune, worth gemming and grinding.',
  },
  {
    tier: 'Rare',
    symbol: '◆',
    range: '>= 50%',
    color: 'text-ga-roll-rare',
    description: 'Average rolls. Usable for mid-game, might sell late-game.',
  },
  {
    tier: 'Magic',
    symbol: '○',
    range: '>= 25%',
    color: 'text-ga-roll-magic',
    description: 'Below average. Usually sell unless the substats are perfect for the build.',
  },
  {
    tier: 'Normal',
    symbol: '·',
    range: '< 25%',
    color: 'text-ga-roll-normal',
    description: 'Minimum or near-minimum rolls. Sell.',
  },
]

// ---------------------------------------------------------------------------
// Section 7 — Progressive Sell Guide
// ---------------------------------------------------------------------------

export interface SellStep {
  level: string
  action: string
  details: string
  color: string
}

export const SELL_GUIDE: SellStep[] = [
  {
    level: '+0',
    action: 'Check base subs & potential',
    details:
      'The scanner evaluates POTENTIAL, not just current value. If the rune has 3-4 desired stats for an archetype, it gets an UPGRADE advice even with low current efficiency. Auto-sell if: flat main on 2/4/6, dead stat combos (ACC+RES together), or less than 2 useful subs for any archetype.',
    color: 'border-ga-tier-sell/30 bg-ga-tier-sell/5',
  },
  {
    level: '+3',
    action: 'First roll — potential check',
    details:
      'If potential weighted efficiency >= threshold for your profile, keep upgrading. The system considers what the rune COULD become with good rolls and a gem, not just the current state. Early: >= 35, Mid: >= 45, Late: >= 55.',
    color: 'border-ga-roll-legend/30 bg-ga-roll-legend/5',
  },
  {
    level: '+6',
    action: 'Second roll — narrowing down',
    details:
      "Potential narrows as rolls happen. If 2 rolls went into bad stats, even good base subs can't save it. Thresholds: Early: >= 40, Mid: >= 50, Late: >= 60. The system factors in gem potential (replacing worst sub).",
    color: 'border-warning/30 bg-warning/5',
  },
  {
    level: '+9',
    action: 'Third roll — last chance',
    details:
      'Must have solid weighted efficiency. The scanner checks post-gem potential: if gemming the worst stat would push above threshold, advice is still UPGRADE. Thresholds: Early: >= 45, Mid: >= 55, Late: >= 65.',
    color: 'border-ga-roll-rare/30 bg-ga-roll-rare/5',
  },
  {
    level: '+12',
    action: 'Final verdict — grind or sell',
    details:
      'Calculate final roll quality and weighted efficiency. If above threshold (Early: >= 50, Mid: >= 60, Late: >= 70), keep and grind. Otherwise sell. Mana is a resource too.',
    color: 'border-ga-roll-hero/30 bg-ga-roll-hero/5',
  },
]

// ---------------------------------------------------------------------------
// Section 8 — Roll Breakdown Symbols
// ---------------------------------------------------------------------------

export interface RollSymbol {
  symbol: string
  tier: string
  range: string
  color: string
  example: string
}

export const ROLL_SYMBOLS: RollSymbol[] = [
  {
    symbol: '★',
    tier: 'Legend',
    range: '95-100% of max',
    color: 'text-ga-roll-legend',
    example: 'SPD roll of 6 (max 6) = ★',
  },
  {
    symbol: '●',
    tier: 'Hero',
    range: '75-94% of max',
    color: 'text-ga-roll-hero',
    example: 'CD roll of 6 (max 7) = 86% ●',
  },
  {
    symbol: '◆',
    tier: 'Rare',
    range: '50-74% of max',
    color: 'text-ga-roll-rare',
    example: 'ATK% roll of 6 (max 8) = 75% ◆',
  },
  {
    symbol: '○',
    tier: 'Magic',
    range: '25-49% of max',
    color: 'text-ga-roll-magic',
    example: 'HP% roll of 5 (max 8) = 38% ○',
  },
  {
    symbol: '·',
    tier: 'Normal',
    range: '0-24% of max',
    color: 'text-ga-roll-normal',
    example: 'SPD roll of 4 (max 6) = 0% ·',
  },
]

// ---------------------------------------------------------------------------
// Section 9 — Gem/Grind Recommendations per Archetype
// ---------------------------------------------------------------------------

export interface GemGrindRec {
  archetype: string
  emoji: string
  gemTarget: string
  gemReplace: string
  grindStats: string[]
  example: string
}

export const GEM_GRIND_RECS: GemGrindRec[] = [
  {
    archetype: 'Speed DPS',
    emoji: '⚡',
    gemTarget: 'RES or ACC',
    gemReplace: 'SPD or CR',
    grindStats: ['ATK%', 'SPD', 'HP%'],
    example: 'Gem RES → SPD, grind ATK% + SPD',
  },
  {
    archetype: 'Bruiser',
    emoji: '💪',
    gemTarget: 'ACC or ATK flat',
    gemReplace: 'HP% or CR',
    grindStats: ['HP%', 'SPD', 'DEF%'],
    example: 'Gem ACC → HP%, grind HP% + SPD',
  },
  {
    archetype: 'Tank/Support',
    emoji: '🛡️',
    gemTarget: 'CR or CD',
    gemReplace: 'HP% or DEF%',
    grindStats: ['HP%', 'DEF%', 'SPD'],
    example: 'Gem CR → DEF%, grind HP% + DEF%',
  },
  {
    archetype: 'Cleave',
    emoji: '💀',
    gemTarget: 'RES or DEF%',
    gemReplace: 'ATK% or CD',
    grindStats: ['ATK%', 'SPD'],
    example: 'Gem RES → ATK%, grind ATK% + SPD',
  },
  {
    archetype: 'CC/Debuffer',
    emoji: '🎯',
    gemTarget: 'CR or CD',
    gemReplace: 'ACC or SPD',
    grindStats: ['HP%', 'DEF%', 'SPD'],
    example: 'Gem CD → ACC, grind HP% + SPD',
  },
  {
    archetype: 'Bomber',
    emoji: '💣',
    gemTarget: 'RES or DEF%',
    gemReplace: 'ATK% or ACC',
    grindStats: ['ATK%', 'SPD', 'HP%'],
    example: 'Gem DEF% → ATK%, grind ATK% + SPD',
  },
  {
    archetype: 'Strip/Cleanse',
    emoji: '✨',
    gemTarget: 'CR or CD',
    gemReplace: 'SPD or HP%',
    grindStats: ['HP%', 'SPD', 'DEF%'],
    example: 'Gem CR → HP%, grind HP% + SPD',
  },
  {
    archetype: 'Healer',
    emoji: '💚',
    gemTarget: 'CR or CD',
    gemReplace: 'HP% or SPD',
    grindStats: ['HP%', 'SPD', 'DEF%'],
    example: 'Gem CD → HP%, grind HP% + SPD',
  },
  {
    archetype: 'One-Shot',
    emoji: '🔫',
    gemTarget: 'RES or HP%',
    gemReplace: 'CR or CD',
    grindStats: ['ATK%', 'SPD'],
    example: 'Gem RES → CD, grind ATK% + SPD',
  },
  {
    archetype: 'DEF Nuker',
    emoji: '🏰',
    gemTarget: 'RES or ATK%',
    gemReplace: 'DEF% or CD',
    grindStats: ['DEF%', 'SPD'],
    example: 'Gem ATK% → DEF%, grind DEF% + SPD',
  },
  {
    archetype: 'Vamp Bruiser',
    emoji: '🧛',
    gemTarget: 'RES or ACC',
    gemReplace: 'CR or HP%',
    grindStats: ['ATK%', 'HP%', 'SPD'],
    example: 'Gem RES → HP%, grind ATK% + HP%',
  },
  {
    archetype: 'Revenge',
    emoji: '🔄',
    gemTarget: 'ATK% or ACC',
    gemReplace: 'HP% or DEF%',
    grindStats: ['HP%', 'DEF%', 'SPD'],
    example: 'Gem ATK% → HP%, grind HP% + DEF%',
  },
  {
    archetype: 'Speed Lead',
    emoji: '🏃',
    gemTarget: 'CR or CD',
    gemReplace: 'SPD or HP%',
    grindStats: ['HP%', 'DEF%', 'SPD'],
    example: 'Gem CD → HP%, grind HP% + SPD',
  },
  {
    archetype: 'Raid',
    emoji: '⚔️',
    gemTarget: 'CR or CD',
    gemReplace: 'HP% or RES',
    grindStats: ['HP%', 'DEF%', 'SPD'],
    example: 'Gem CD → RES, grind HP% + DEF% + SPD',
  },
]

// ---------------------------------------------------------------------------
// Section 10 — Sources
// ---------------------------------------------------------------------------

export interface Source {
  name: string
  url: string
  description: string
}

export const SOURCES: Source[] = [
  {
    name: 'SWARFARM',
    url: 'https://swarfarm.com',
    description: 'Community data mining — rune drop rates, monster stats, skill data.',
  },
  {
    name: 'Summoners War Wiki (Fandom)',
    url: 'https://summonerswar.fandom.com',
    description: 'Comprehensive wiki with rune mechanics, set bonuses, and upgrade formulas.',
  },
  {
    name: 'SW Optimizer (tool-106)',
    url: 'https://tool.swop.one',
    description: 'Rune optimizer — efficiency calculations and build planning.',
  },
  {
    name: 'Summoners War Subreddit',
    url: 'https://reddit.com/r/summonerswar',
    description: 'Community discussions, tier lists, and meta analysis.',
  },
]
