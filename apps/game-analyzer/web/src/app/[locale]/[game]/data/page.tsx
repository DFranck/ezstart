'use client'

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
  Div,
  H1,
  P,
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
// Section 1 — Stat Priority par Build Archetype
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

const RANK_COLORS: Record<number, string> = {
  1: 'bg-ga-roll-legend/20 text-ga-roll-legend border-ga-roll-legend/40',
  2: 'bg-ga-roll-hero/20 text-ga-roll-hero border-ga-roll-hero/40',
  3: 'bg-ga-roll-rare/20 text-ga-roll-rare border-ga-roll-rare/40',
  4: 'bg-ga-roll-magic/20 text-ga-roll-magic border-ga-roll-magic/40',
  5: 'bg-ga-roll-normal/20 text-ga-roll-normal border-ga-roll-normal/40',
}

function RankBadge({ stat, rank }: StatPriority) {
  return (
    <Badge variant="outline" className={`text-xs border ${RANK_COLORS[rank] ?? RANK_COLORS[5]}`}>
      {stat}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Section 2 — Rune Sets
// ---------------------------------------------------------------------------

interface RuneSet {
  name: string
  emoji: string
  pieces: number
  bonus: string
  description: string
  idealSubs: string[]
}

const RUNE_SETS: RuneSet[] = [
  { name: 'Energy', emoji: '💚', pieces: 2, bonus: 'HP +15%', description: 'Basic HP set, good for early game tanks and supports.', idealSubs: ['HP%', 'DEF%', 'SPD', 'RES'] },
  { name: 'Fatal', emoji: '⚔️', pieces: 4, bonus: 'ATK +35%', description: 'Best early-game attack set for nukers.', idealSubs: ['ATK%', 'CR', 'CD', 'SPD'] },
  { name: 'Blade', emoji: '🗡️', pieces: 2, bonus: 'CR +12%', description: 'Crit rate offset. Pairs well with any DD set.', idealSubs: ['CR', 'CD', 'ATK%', 'SPD'] },
  { name: 'Swift', emoji: '💨', pieces: 4, bonus: 'SPD +25%', description: 'Speed is king. Core set for first-turn units.', idealSubs: ['SPD', 'HP%', 'DEF%', 'ACC'] },
  { name: 'Focus', emoji: '🎯', pieces: 2, bonus: 'ACC +20%', description: 'Accuracy offset for debuffers and CC.', idealSubs: ['ACC', 'SPD', 'HP%', 'DEF%'] },
  { name: 'Guard', emoji: '🛡️', pieces: 2, bonus: 'DEF +15%', description: 'Defense offset for frontliners and def-scalers.', idealSubs: ['DEF%', 'HP%', 'SPD', 'RES'] },
  { name: 'Endure', emoji: '🔒', pieces: 2, bonus: 'RES +20%', description: 'Resistance offset for raid and RTA.', idealSubs: ['RES', 'HP%', 'DEF%', 'SPD'] },
  { name: 'Violent', emoji: '💥', pieces: 4, bonus: '22% extra turn', description: 'The most broken set in the game. Extra turns win fights.', idealSubs: ['SPD', 'HP%', 'CR', 'CD'] },
  { name: 'Will', emoji: '🛡️✨', pieces: 2, bonus: '1-turn immunity', description: 'Essential for PvP. Prevents turn 1 CC.', idealSubs: ['SPD', 'HP%', 'DEF%', 'ATK%'] },
  { name: 'Nemesis', emoji: '⚡', pieces: 2, bonus: 'ATB +4% per 7% HP lost', description: 'Counter Lushen / AoE. Cuts in after big hits.', idealSubs: ['HP%', 'SPD', 'DEF%', 'RES'] },
  { name: 'Despair', emoji: '😵', pieces: 4, bonus: '25% stun on AoE', description: 'AoE stun machine. Great for ToA and CC units.', idealSubs: ['SPD', 'HP%', 'ACC', 'DEF%'] },
  { name: 'Vampire', emoji: '🧛', pieces: 4, bonus: '35% lifesteal', description: 'Self-sustain for solo/dimension hole content.', idealSubs: ['ATK%', 'CR', 'CD', 'SPD'] },
  { name: 'Destroy', emoji: '💀', pieces: 2, bonus: '30% damage → reduce max HP', description: 'Anti-sustain. Slowly wears down healers.', idealSubs: ['HP%', 'DEF%', 'SPD', 'CR'] },
  { name: 'Rage', emoji: '🔥', pieces: 4, bonus: 'CD +40%', description: 'Max damage output. Pair with Blade or Will.', idealSubs: ['CD', 'CR', 'ATK%', 'SPD'] },
  { name: 'Revenge', emoji: '🔄', pieces: 2, bonus: '15% counterattack', description: 'Great on Verdehile and defense units.', idealSubs: ['SPD', 'HP%', 'CR', 'DEF%'] },
  { name: 'Shield', emoji: '🛡️💎', pieces: 2, bonus: '3-turn 15% HP shield (party)', description: 'Team protection in cleave and siege.', idealSubs: ['HP%', 'DEF%', 'SPD', 'ATK%'] },
  { name: 'Tolerance', emoji: '🧘', pieces: 2, bonus: 'RES +10% (party)', description: 'Team resistance for raid and PvP.', idealSubs: ['HP%', 'DEF%', 'SPD', 'RES'] },
  { name: 'Fight', emoji: '👊', pieces: 2, bonus: 'ATK +8% (party)', description: 'Team damage boost. Stack on supports.', idealSubs: ['HP%', 'DEF%', 'SPD', 'ATK%'] },
  { name: 'Determination', emoji: '🏰', pieces: 2, bonus: 'DEF +8% (party)', description: 'Team defense for siege and 4* towers.', idealSubs: ['HP%', 'DEF%', 'SPD', 'RES'] },
  { name: 'Enhance', emoji: '✨', pieces: 2, bonus: 'HP +8% (party)', description: 'Team HP boost. Good on siege supports.', idealSubs: ['HP%', 'DEF%', 'SPD', 'RES'] },
  { name: 'Accuracy', emoji: '🎯✨', pieces: 2, bonus: 'ACC +10% (party)', description: 'Team accuracy for dungeon/raid comps.', idealSubs: ['SPD', 'HP%', 'ACC', 'DEF%'] },
  { name: 'Seal', emoji: '🔗', pieces: 2, bonus: '15% activate seal on attack', description: 'Newer set. Prevents passive use.', idealSubs: ['SPD', 'HP%', 'ACC', 'DEF%'] },
]

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
// Section 4 — Substat Roll Ranges (6-star)
// ---------------------------------------------------------------------------

interface RollRange {
  stat: string
  min: number
  max: number
  unit: string
}

const ROLL_RANGES: RollRange[] = [
  { stat: 'HP flat', min: 135, max: 375, unit: '' },
  { stat: 'HP%', min: 5, max: 8, unit: '%' },
  { stat: 'ATK flat', min: 10, max: 20, unit: '' },
  { stat: 'ATK%', min: 5, max: 8, unit: '%' },
  { stat: 'DEF flat', min: 10, max: 20, unit: '' },
  { stat: 'DEF%', min: 5, max: 8, unit: '%' },
  { stat: 'SPD', min: 4, max: 6, unit: '' },
  { stat: 'CR', min: 4, max: 6, unit: '%' },
  { stat: 'CD', min: 4, max: 7, unit: '%' },
  { stat: 'RES', min: 4, max: 8, unit: '%' },
  { stat: 'ACC', min: 4, max: 8, unit: '%' },
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
// Section 6 — Grindstone & Gem Values (matches rune-data.ts constants)
// ---------------------------------------------------------------------------

interface GrindGemRange {
  stat: string
  grind: { magic: string; rare: string; hero: string; legend: string }
  gem: { magic: string; rare: string; hero: string; legend: string }
}

const GRIND_GEM_DATA: GrindGemRange[] = [
  { stat: 'HP flat', grind: { magic: '100-200', rare: '180-250', hero: '230-450', legend: '430-550' }, gem: { magic: '100-200', rare: '180-280', hero: '250-420', legend: '400-580' } },
  { stat: 'HP%', grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'ATK flat', grind: { magic: '6-12', rare: '10-18', hero: '12-22', legend: '18-30' }, gem: { magic: '8-12', rare: '10-16', hero: '15-23', legend: '20-30' } },
  { stat: 'ATK%', grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'DEF flat', grind: { magic: '6-12', rare: '10-18', hero: '12-22', legend: '18-30' }, gem: { magic: '8-12', rare: '10-16', hero: '15-23', legend: '20-30' } },
  { stat: 'DEF%', grind: { magic: '2-5%', rare: '3-6%', hero: '4-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'SPD', grind: { magic: '1-2', rare: '2-3', hero: '3-4', legend: '4-5' }, gem: { magic: '1-3', rare: '2-4', hero: '3-6', legend: '5-8' } },
  { stat: 'CR', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-3%', rare: '3-5%', hero: '4-6%', legend: '5-8%' } },
  { stat: 'CD', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '3-5%', hero: '4-7%', legend: '5-9%' } },
  { stat: 'RES', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
  { stat: 'ACC', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '4-6%', hero: '5-9%', legend: '7-11%' } },
]

// ---------------------------------------------------------------------------
// Section 7 — Roll Quality Tiers (NEW — replaces old Efficiency Thresholds)
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

// ---------------------------------------------------------------------------
// Section 8 — Progressive Sell Guide (updated with potential-based logic)
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
// Section 9 — Roll Breakdown Symbols
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

// ---------------------------------------------------------------------------
// Section 10 — Stat Priority Weights per Archetype
// ---------------------------------------------------------------------------

interface WeightRow {
  archetype: string
  emoji: string
  description: string
  weights: Record<string, number>
}

const ALL_STATS = ['SPD', 'CR', 'CD', 'ATK%', 'HP%', 'DEF%', 'ACC', 'RES', 'ATK', 'DEF', 'HP']

const WEIGHT_ROWS: WeightRow[] = [
  { archetype: 'Speed DPS', emoji: '⚡', description: 'Lushen, Kaki, Alicia', weights: { SPD: 1.0, CR: 0.9, CD: 0.85, 'ATK%': 0.8, 'HP%': 0.4, 'DEF%': 0.3, ACC: 0.3, RES: 0.2, ATK: 0.3, DEF: 0.1, HP: 0.1 } },
  { archetype: 'Bruiser', emoji: '💪', description: 'Vigor, Karnal, Mo Long', weights: { 'HP%': 1.0, CR: 0.85, CD: 0.8, SPD: 0.75, 'DEF%': 0.6, 'ATK%': 0.5, RES: 0.3, ACC: 0.2, HP: 0.2, ATK: 0.1, DEF: 0.1 } },
  { archetype: 'Tank/Support', emoji: '🛡️', description: 'Fran, Riley, Lulu', weights: { 'HP%': 1.0, 'DEF%': 0.9, SPD: 0.8, RES: 0.7, ACC: 0.4, CR: 0.1, CD: 0.1, 'ATK%': 0.1, HP: 0.3, DEF: 0.2, ATK: 0.05 } },
  { archetype: 'Cleave', emoji: '💀', description: 'Poseidon, Zaiross, Julie', weights: { 'ATK%': 1.0, CR: 0.95, CD: 0.9, SPD: 0.7, 'HP%': 0.3, 'DEF%': 0.2, ACC: 0.3, RES: 0.1, ATK: 0.2, DEF: 0.05, HP: 0.05 } },
  { archetype: 'CC/Debuffer', emoji: '🎯', description: 'Tyron, Loren, Spectra', weights: { SPD: 1.0, ACC: 0.9, 'HP%': 0.7, 'DEF%': 0.6, RES: 0.3, CR: 0.2, CD: 0.1, 'ATK%': 0.1, HP: 0.2, DEF: 0.1, ATK: 0.05 } },
  { archetype: 'Bomber', emoji: '💣', description: 'Seara, Malaka, Liebli', weights: { 'ATK%': 1.0, SPD: 0.9, ACC: 0.8, 'HP%': 0.5, 'DEF%': 0.3, CR: 0.2, CD: 0.1, RES: 0.2, ATK: 0.2, HP: 0.1, DEF: 0.05 } },
  { archetype: 'Strip/Cleanse', emoji: '✨', description: 'Juno, Praha, Velajuel', weights: { SPD: 1.0, 'HP%': 0.85, ACC: 0.8, RES: 0.7, 'DEF%': 0.5, CR: 0.1, CD: 0.1, 'ATK%': 0.1, HP: 0.2, DEF: 0.1, ATK: 0.05 } },
  { archetype: 'Healer', emoji: '💚', description: 'Fran, Ariel, Chasun', weights: { SPD: 1.0, 'HP%': 0.9, 'DEF%': 0.7, ACC: 0.5, RES: 0.4, CR: 0.1, CD: 0.1, 'ATK%': 0.3, HP: 0.2, DEF: 0.1, ATK: 0.05 } },
  { archetype: 'One-Shot', emoji: '🔫', description: 'Copper, Bulldozer, Kahli', weights: { 'ATK%': 1.0, CR: 0.95, CD: 0.95, SPD: 0.5, 'HP%': 0.2, 'DEF%': 0.1, ACC: 0.1, RES: 0.05, ATK: 0.3, DEF: 0.05, HP: 0.05 } },
  { archetype: 'DEF Nuker', emoji: '🏰', description: 'Copper, Bulldozer, Feng Yan', weights: { 'DEF%': 1.0, CR: 0.95, CD: 0.95, SPD: 0.5, 'HP%': 0.3, 'ATK%': 0.1, ACC: 0.1, RES: 0.1, DEF: 0.3, ATK: 0.05, HP: 0.1 } },
  { archetype: 'Vamp Bruiser', emoji: '🧛', description: 'Laika, Rakan', weights: { 'ATK%': 0.9, CR: 0.85, CD: 0.8, 'HP%': 0.8, SPD: 0.5, 'DEF%': 0.3, ACC: 0.1, RES: 0.1, ATK: 0.2, DEF: 0.05, HP: 0.1 } },
  { archetype: 'Revenge', emoji: '🔄', description: 'Miho, Rina', weights: { 'HP%': 0.9, 'DEF%': 0.85, CR: 0.7, CD: 0.6, SPD: 0.3, RES: 0.4, ACC: 0.1, 'ATK%': 0.1, HP: 0.2, DEF: 0.2, ATK: 0.05 } },
  { archetype: 'Speed Lead', emoji: '🏃', description: 'Bernard, Kabilla, Orion', weights: { SPD: 1.0, 'HP%': 0.8, 'DEF%': 0.6, RES: 0.5, ACC: 0.3, CR: 0.1, CD: 0.1, 'ATK%': 0.1, HP: 0.2, DEF: 0.1, ATK: 0.05 } },
  { archetype: 'Raid', emoji: '⚔️', description: 'Colleen, Fran (R5)', weights: { SPD: 0.9, 'HP%': 0.9, 'DEF%': 0.8, RES: 0.8, ACC: 0.3, CR: 0.1, CD: 0.1, 'ATK%': 0.1, HP: 0.2, DEF: 0.2, ATK: 0.05 } },
]

// ---------------------------------------------------------------------------
// Section 11 — Gem/Grind Recommendations per Archetype
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

// ---------------------------------------------------------------------------
// Section 12 — Sources
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function weightColor(w: number): string {
  if (w >= 0.9) return 'text-ga-roll-legend font-bold'
  if (w >= 0.7) return 'text-ga-roll-hero font-semibold'
  if (w >= 0.5) return 'text-ga-roll-rare'
  if (w >= 0.3) return 'text-ga-roll-magic'
  return 'text-ga-roll-normal'
}

export default function GameDataPage() {
  return (
    <Div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <Div className="mb-6">
        <H1 className="text-lg font-bold">Reference Data</H1>
        <P className="text-muted-foreground text-sm mt-1">
          All Summoners War rune reference tables, efficiency guides, and grindstone values in one place.
        </P>
      </Div>

      <Accordion type="multiple" defaultValue={['archetypes']} className="space-y-2">
        {/* ---- Section 1: Archetypes ---- */}
        <AccordionItem value="archetypes">
          <AccordionTrigger className="text-base font-semibold">
            1. Stat Priority by Build Archetype
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 2: Rune Sets ---- */}
        <AccordionItem value="sets">
          <AccordionTrigger className="text-base font-semibold">
            2. Rune Sets
          </AccordionTrigger>
          <AccordionContent>
            <Div className="overflow-x-auto">
              <Table variant="striped" size="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[130px]">Set</TableHead>
                    <TableHead className="w-[50px] text-center">Pcs</TableHead>
                    <TableHead className="min-w-[160px]">Bonus</TableHead>
                    <TableHead className="min-w-[220px]">Ideal Subs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RUNE_SETS.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Div className="flex items-center gap-1.5 cursor-help">
                              <span>{s.emoji}</span>
                              <span className="font-medium">{s.name}</span>
                            </Div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[250px]">
                            {s.description}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">{s.pieces}</TableCell>
                      <TableCell className="text-xs">{s.bonus}</TableCell>
                      <TableCell>
                        <Div className="flex flex-wrap gap-1">
                          {s.idealSubs.map((sub, i) => (
                            <Badge key={sub} variant="outline" className={`text-xs border ${RANK_COLORS[i + 1] ?? RANK_COLORS[5]}`}>
                              {sub}
                            </Badge>
                          ))}
                        </Div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 3: Slot Stats ---- */}
        <AccordionItem value="slots">
          <AccordionTrigger className="text-base font-semibold">
            3. Stat Values by Slot
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 4: Roll Ranges ---- */}
        <AccordionItem value="rolls">
          <AccordionTrigger className="text-base font-semibold">
            4. Substat Roll Ranges (6-star)
          </AccordionTrigger>
          <AccordionContent>
            <Div className="overflow-x-auto">
              <Table variant="striped" size="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Stat</TableHead>
                    <TableHead className="w-[70px] text-right">Min</TableHead>
                    <TableHead className="w-[70px] text-right">Max</TableHead>
                    <TableHead className="min-w-[200px]">Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROLL_RANGES.map((r) => {
                    const pct = ((r.max - r.min) / r.max) * 100
                    const fillPct = (r.min / r.max) * 100
                    return (
                      <TableRow key={r.stat}>
                        <TableCell className="font-medium">{r.stat}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.min}{r.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.max}{r.unit}</TableCell>
                        <TableCell>
                          <Div className="flex items-center gap-2">
                            <Div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                              <Div
                                className="absolute inset-y-0 left-0 bg-ga-roll-rare/60 rounded-full"
                                style={{ width: `${fillPct}%` }}
                              />
                              <Div
                                className="absolute inset-y-0 bg-ga-roll-rare rounded-full"
                                style={{ left: `${fillPct}%`, width: `${pct - (100 - fillPct)}%` }}
                              />
                            </Div>
                          </Div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 5: Main Stat Values ---- */}
        <AccordionItem value="main-stats">
          <AccordionTrigger className="text-base font-semibold">
            5. Main Stat Values (+0 to +15)
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 6: Grindstones & Gems ---- */}
        <AccordionItem value="grinds">
          <AccordionTrigger className="text-base font-semibold">
            6. Grindstone & Gem Values
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <Div>
                <P className="font-medium text-sm mb-2">Grindstones</P>
                <P className="text-xs text-muted-foreground mb-2">
                  Only grindable stats: HP, HP%, ATK, ATK%, DEF, DEF%, SPD. CR, CD, RES, ACC cannot be grinded.
                </P>
                <Div className="overflow-x-auto">
                  <Table variant="striped" size="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[90px]">Stat</TableHead>
                        <TableHead className="text-center">Magic</TableHead>
                        <TableHead className="text-center">Rare</TableHead>
                        <TableHead className="text-center">Hero</TableHead>
                        <TableHead className="text-center">Legend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {GRIND_GEM_DATA.map((g) => (
                        <TableRow key={g.stat}>
                          <TableCell className="font-medium">{g.stat}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.grind.magic}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.grind.rare}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.grind.hero}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.grind.legend}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Div>
              </Div>

              <Div>
                <P className="font-medium text-sm mb-2">
                  <TT tip="Enchanted gems replace one substat entirely with a new value. Unlike grinds, gems can target ANY stat including CR, CD, RES, ACC.">Enchanted Gems</TT>
                </P>
                <Div className="overflow-x-auto">
                  <Table variant="striped" size="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[90px]">Stat</TableHead>
                        <TableHead className="text-center">Magic</TableHead>
                        <TableHead className="text-center">Rare</TableHead>
                        <TableHead className="text-center">Hero</TableHead>
                        <TableHead className="text-center">Legend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {GRIND_GEM_DATA.map((g) => (
                        <TableRow key={g.stat}>
                          <TableCell className="font-medium">{g.stat}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.gem.magic}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.gem.rare}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.gem.hero}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{g.gem.legend}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Div>
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 7: Roll Quality Tiers ---- */}
        <AccordionItem value="roll-quality">
          <AccordionTrigger className="text-base font-semibold">
            7. <TT tip="The average quality of each roll compared to the maximum possible value for that stat.">Roll Quality</TT> Tiers
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                <TT tip="The average quality of each roll compared to the maximum possible value for that stat.">Roll Quality</TT> measures how close each substat roll landed to the maximum possible value. It replaces the old efficiency threshold system with a more intuitive tier system.
              </P>

              <Div className="overflow-x-auto">
                <Table variant="striped" size="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Symbol</TableHead>
                      <TableHead className="w-[90px]">Tier</TableHead>
                      <TableHead className="w-[120px]">Avg Roll %</TableHead>
                      <TableHead className="min-w-[200px]">Meaning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLL_QUALITY_TIERS.map((t) => (
                      <TableRow key={t.tier}>
                        <TableCell className={`text-center text-lg ${t.color}`}>{t.symbol}</TableCell>
                        <TableCell className={`font-medium ${t.color}`}>{t.tier}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.range}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Div>

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
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 8: Progressive Sell Guide ---- */}
        <AccordionItem value="sell-guide">
          <AccordionTrigger className="text-base font-semibold">
            8. <TT tip="The advice considers both current quality AND gem/grind potential, not just the current efficiency number.">Progressive Sell Guide</TT>
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground mb-2">
                The progressive system evaluates runes at each power-up milestone. Unlike static thresholds, it considers what the rune COULD become (potential) — not just its current state. If the potential weighted efficiency after gemming exceeds the threshold, the advice is UPGRADE even if current efficiency looks low.
              </P>

              {/* Threshold table per profile */}
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

              {/* Dead stat combos */}
              <Card size="sm" className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-3">
                  <P className="font-medium text-sm mb-1">Auto-sell: Dead Stat Combos</P>
                  <P className="text-xs text-muted-foreground">
                    Runes with <strong>ACC + RES</strong> together are auto-sell. No monster needs both stats — this combination means the rune has no viable archetype.
                  </P>
                </CardContent>
              </Card>

              {/* Step-by-step guide */}
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

        {/* ---- Section 9: Roll Breakdown ---- */}
        <AccordionItem value="roll-breakdown">
          <AccordionTrigger className="text-base font-semibold">
            9. <TT tip="Each individual substat roll is graded from Legend to Normal based on how close it landed to the maximum possible value.">Roll Breakdown</TT> — Reading Roll Badges
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                Each individual roll into a substat is graded based on how close it landed to the maximum. The badges appear next to each substat in the rune card.
              </P>

              <Div className="overflow-x-auto">
                <Table variant="striped" size="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Badge</TableHead>
                      <TableHead className="w-[80px]">Tier</TableHead>
                      <TableHead className="w-[120px]">Range</TableHead>
                      <TableHead className="min-w-[200px]">Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLL_SYMBOLS.map((r) => (
                      <TableRow key={r.tier}>
                        <TableCell className={`text-center text-lg ${r.color}`}>{r.symbol}</TableCell>
                        <TableCell className={`font-medium ${r.color}`}>{r.tier}</TableCell>
                        <TableCell className="text-xs">{r.range}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Div>

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
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 10: Stat Priority Weights ---- */}
        <AccordionItem value="stat-weights">
          <AccordionTrigger className="text-base font-semibold">
            10. <TT tip="Numerical weights (0.05 to 1.0) that determine how much each stat contributes to the weighted efficiency score for a given archetype.">Stat Priority Weights</TT> by Archetype
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                These weights determine the <TT tip="Efficiency score adjusted by stat importance for the best matching archetype. A rune with high rolls into important stats scores higher than one with high rolls into useless stats.">weighted efficiency</TT> score. A weight of 1.0 means the stat is top priority; 0.05 means nearly useless. The scanner auto-detects the best archetype for each rune.
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
                      <TableRow key={row.archetype}>
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

              <P className="text-xs text-muted-foreground italic">
                Color coding: <span className="text-ga-roll-legend font-bold">1.0-0.9</span> top priority, <span className="text-ga-roll-hero font-semibold">0.7-0.89</span> high, <span className="text-ga-roll-rare">0.5-0.69</span> medium, <span className="text-ga-roll-magic">0.3-0.49</span> low, <span className="text-ga-roll-normal">below 0.3</span> useless.
              </P>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 11: Gem/Grind Recommendations ---- */}
        <AccordionItem value="gem-grind-recs">
          <AccordionTrigger className="text-base font-semibold">
            11. <TT tip="Which stat to gem (replace the worst substat) and which stats to grind (add flat bonus) for each archetype.">Gem/Grind Recommendations</TT> by Archetype
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <P className="text-xs text-muted-foreground">
                For each archetype, the scanner identifies the worst substat (lowest weight) as the <TT tip="The substat with the lowest priority weight for the best matching archetype. This is the stat that should be replaced by an enchanted gem.">gem target</TT>. Grindable stats that match the archetype should always be grinded.
              </P>

              <Div className="overflow-x-auto">
                <Table variant="striped" size="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Archetype</TableHead>
                      <TableHead className="min-w-[100px]">
                        <TT tip="The substat with the lowest priority weight for this archetype — replace it with an enchanted gem.">Gem Target</TT>
                      </TableHead>
                      <TableHead className="min-w-[100px]">
                        <TT tip="The stat you should gem IN (replace the bad stat with this one).">Gem With</TT>
                      </TableHead>
                      <TableHead className="min-w-[120px]">
                        <TT tip="Stats that are both grindable (HP, ATK, DEF, SPD) and useful for this archetype.">Grind Stats</TT>
                      </TableHead>
                      <TableHead className="min-w-[200px]">Example</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {GEM_GRIND_RECS.map((r) => (
                      <TableRow key={r.archetype}>
                        <TableCell>
                          <Div className="flex items-center gap-1.5">
                            <span>{r.emoji}</span>
                            <span className="font-medium text-xs">{r.archetype}</span>
                          </Div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs border-destructive/40 text-destructive-foreground">{r.gemTarget}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs border-success/40 text-success-foreground">{r.gemReplace}</Badge></TableCell>
                        <TableCell>
                          <Div className="flex flex-wrap gap-1">
                            {r.grindStats.map((s) => (
                              <Badge key={s} variant="outline" className="text-xs border-ga-roll-rare/40 text-ga-roll-rare">{s}</Badge>
                            ))}
                          </Div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{r.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 12: Sources ---- */}
        <AccordionItem value="sources">
          <AccordionTrigger className="text-base font-semibold">
            12. Sources
          </AccordionTrigger>
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
