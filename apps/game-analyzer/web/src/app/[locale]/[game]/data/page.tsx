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
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  2: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  3: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  4: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  5: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
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
// Section 6 — Grindstone & Gem Values
// ---------------------------------------------------------------------------

interface GrindGemRange {
  stat: string
  grind: { magic: string; rare: string; hero: string; legend: string }
  gem: { magic: string; rare: string; hero: string; legend: string }
}

const GRIND_GEM_DATA: GrindGemRange[] = [
  { stat: 'HP flat', grind: { magic: '100-200', rare: '200-300', hero: '300-420', legend: '420-580' }, gem: { magic: '100-200', rare: '200-310', hero: '310-440', legend: '430-580' } },
  { stat: 'HP%', grind: { magic: '1-3%', rare: '2-5%', hero: '3-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '3-6%', hero: '5-8%', legend: '6-11%' } },
  { stat: 'ATK flat', grind: { magic: '6-12', rare: '10-18', hero: '18-24', legend: '22-30' }, gem: { magic: '8-12', rare: '10-18', hero: '18-26', legend: '22-30' } },
  { stat: 'ATK%', grind: { magic: '1-3%', rare: '2-5%', hero: '3-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '3-6%', hero: '5-8%', legend: '6-11%' } },
  { stat: 'DEF flat', grind: { magic: '6-12', rare: '10-18', hero: '18-24', legend: '22-30' }, gem: { magic: '8-12', rare: '10-18', hero: '18-26', legend: '22-30' } },
  { stat: 'DEF%', grind: { magic: '1-3%', rare: '2-5%', hero: '3-7%', legend: '5-10%' }, gem: { magic: '2-4%', rare: '3-6%', hero: '5-8%', legend: '6-11%' } },
  { stat: 'SPD', grind: { magic: '1-2', rare: '1-3', hero: '2-4', legend: '3-5' }, gem: { magic: '1-3', rare: '2-4', hero: '3-5', legend: '4-6' } },
  { stat: 'CR', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '3-5%', hero: '4-6%', legend: '5-7%' } },
  { stat: 'CD', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '3-5%', hero: '4-6%', legend: '5-7%' } },
  { stat: 'RES', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '3-6%', hero: '4-7%', legend: '6-9%' } },
  { stat: 'ACC', grind: { magic: '-', rare: '-', hero: '-', legend: '-' }, gem: { magic: '2-4%', rare: '3-6%', hero: '4-7%', legend: '6-9%' } },
]

// ---------------------------------------------------------------------------
// Section 7 — Efficiency Thresholds
// ---------------------------------------------------------------------------

interface EffThreshold {
  stage: string
  keep: string
  gem: string
  reapp: string
  description: string
}

const EFF_THRESHOLDS: EffThreshold[] = [
  { stage: 'Early game', keep: '> 50%', gem: '> 60%', reapp: '-', description: 'Keep anything usable. Focus on completing sets for GB10/DB10.' },
  { stage: 'Mid game', keep: '> 60%', gem: '> 70%', reapp: '> 50% (slot 2/4/6 legend 6*)', description: 'Tighten standards. Sell low rolls. Start building PvP runes.' },
  { stage: 'Late game', keep: '> 70%', gem: '> 80%', reapp: '> 60% (legend 6* only)', description: 'Only keep great runes. Grind and gem everything you keep.' },
  { stage: 'End game', keep: '> 80%', gem: '> 85%', reapp: '> 70% (slot 2/4/6 Vio/Will/Swift legend)', description: 'Perfection. Only legend runes with quad/triple rolls matter.' },
]

const UPGRADE_RULES = [
  { level: '+3', rule: 'Sell if roll goes into flat stat or unwanted sub.' },
  { level: '+6', rule: 'Sell if no SPD roll (for speed runes) or 2 bad rolls.' },
  { level: '+9', rule: 'Last check. Must have at least 2 good rolls to continue.' },
  { level: '+12', rule: 'Final verdict. Calculate efficiency. Keep, grind, or sell.' },
]

// ---------------------------------------------------------------------------
// Section 8 — Progressive Sell Guide
// ---------------------------------------------------------------------------

interface SellStep {
  level: string
  action: string
  details: string
  color: string
}

const SELL_GUIDE: SellStep[] = [
  { level: '+0', action: 'Check base subs', details: 'Sell immediately if: flat main on 2/4/6, less than 3 useful subs on legend, no speed on speed rune, wrong set for the subs.', color: 'border-red-500/30 bg-red-500/5' },
  { level: '+3', action: 'First roll check', details: 'Sell if: roll went into flat stat, roll was minimum value into a mediocre stat, only 1 usable sub remaining after the roll.', color: 'border-orange-500/30 bg-orange-500/5' },
  { level: '+6', action: 'Second roll check', details: 'Sell if: no SPD roll yet (for speed runes), 2 rolls into different low-priority stats, efficiency below 50% projection.', color: 'border-yellow-500/30 bg-yellow-500/5' },
  { level: '+9', action: 'Third roll — last chance', details: 'Must have at least 2 high rolls into desired stats. If the rune has been mediocre for 3 rolls, cut your losses.', color: 'border-blue-500/30 bg-blue-500/5' },
  { level: '+12', action: 'Final verdict', details: 'Calculate efficiency. If above your threshold: keep, grind, gem. If below: sell without regret. Mana is a resource too.', color: 'border-purple-500/30 bg-purple-500/5' },
]

// ---------------------------------------------------------------------------
// Section 9 — Sources
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
                                className="absolute inset-y-0 left-0 bg-blue-500/60 rounded-full"
                                style={{ width: `${fillPct}%` }}
                              />
                              <Div
                                className="absolute inset-y-0 bg-blue-500 rounded-full"
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
                <P className="font-medium text-sm mb-2">Enchanted Gems</P>
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

        {/* ---- Section 7: Efficiency Thresholds ---- */}
        <AccordionItem value="efficiency">
          <AccordionTrigger className="text-base font-semibold">
            7. Efficiency Thresholds
          </AccordionTrigger>
          <AccordionContent>
            <Div className="space-y-4">
              <Div className="overflow-x-auto">
                <Table variant="striped" size="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Stage</TableHead>
                      <TableHead>Keep</TableHead>
                      <TableHead>Gem worth</TableHead>
                      <TableHead>Reapp worth</TableHead>
                      <TableHead className="min-w-[200px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EFF_THRESHOLDS.map((e) => (
                      <TableRow key={e.stage}>
                        <TableCell className="font-medium">{e.stage}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.keep}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.gem}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.reapp}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Div>

              <Div>
                <P className="font-medium text-sm mb-2">Upgrade Check Rules</P>
                <Div className="overflow-x-auto">
                  <Table size="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Level</TableHead>
                        <TableHead>Rule</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {UPGRADE_RULES.map((r) => (
                        <TableRow key={r.level}>
                          <TableCell className="font-mono font-medium">{r.level}</TableCell>
                          <TableCell className="text-sm">{r.rule}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Div>
              </Div>
            </Div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 8: Progressive Sell Guide ---- */}
        <AccordionItem value="sell-guide">
          <AccordionTrigger className="text-base font-semibold">
            8. Progressive Sell Guide
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* ---- Section 9: Sources ---- */}
        <AccordionItem value="sources">
          <AccordionTrigger className="text-base font-semibold">
            9. Sources
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
