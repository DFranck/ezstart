import type { ArtifactMainStat, ArtifactQuality, ArtifactSubstatType } from './artifact'

// ============================================
// MAIN STAT MAX VALUES AT +15
// ============================================
export const ARTIFACT_MAIN_STAT_MAX: Record<ArtifactMainStat, number> = {
  atk: 100, // TODO: verify exact value
  def: 100,
  hp: 1500,
}

// ============================================
// SUBSTAT DISPLAY NAMES
// ============================================
export const ARTIFACT_SUBSTAT_NAMES: Record<ArtifactSubstatType, string> = {
  'dmg-to-fire': 'DMG to Fire',
  'dmg-to-water': 'DMG to Water',
  'dmg-to-wind': 'DMG to Wind',
  'dmg-to-light': 'DMG to Light',
  'dmg-to-dark': 'DMG to Dark',
  'dmg-from-fire': 'DMG from Fire -',
  'dmg-from-water': 'DMG from Water -',
  'dmg-from-wind': 'DMG from Wind -',
  'dmg-from-light': 'DMG from Light -',
  'dmg-from-dark': 'DMG from Dark -',
  'skill1-cd': 'S1 Cooldown -',
  'skill2-cd': 'S2 Cooldown -',
  'skill3-cd': 'S3 Cooldown -',
  'skill4-cd': 'S4 Cooldown -',
  'skill1-recovery': 'S1 Recovery +',
  'skill2-recovery': 'S2 Recovery +',
  'skill3-recovery': 'S3 Recovery +',
  'skill1-accuracy': 'S1 Accuracy +',
  'skill2-accuracy': 'S2 Accuracy +',
  'skill3-accuracy': 'S3 Accuracy +',
  'crit-dmg-single': 'CRIT DMG+ (Single)',
  'crit-dmg-aoe': 'CRIT DMG+ (AOE)',
  'hp-lost-atk': 'ATK+ by HP lost',
  'hp-lost-def': 'DEF+ by HP lost',
  'hp-lost-spd': 'SPD+ by HP lost',
  'spd-under-hp-threshold': 'SPD+ under HP threshold',
  'life-drain': 'Life Drain',
  'counter-dmg': 'Counter DMG+',
  'coop-dmg': 'Coop DMG+',
  'bomb-dmg': 'Bomb DMG+',
  'dmg-reduction-single': 'DMG Reduction (Single)',
  'dmg-reduction-aoe': 'DMG Reduction (AOE)',
  'additional-dmg-by-hp': 'Additional DMG by HP',
  'additional-dmg-by-atk': 'Additional DMG by ATK',
  'additional-dmg-by-def': 'Additional DMG by DEF',
  'additional-dmg-by-spd': 'Additional DMG by SPD',
  'recovery-hp': 'Recovery HP+',
  'recovery-ally': 'Ally Recovery+',
  'shield': 'Shield+',
}

// ============================================
// QUALITY / RARITY
// ============================================

// Number of substats by quality at +0
export const ARTIFACT_SUBSTATS_BY_QUALITY: Record<ArtifactQuality, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  hero: 3,
  legend: 4,
}
