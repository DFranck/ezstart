export type ArtifactCategory = 'type' | 'attribute'

export type ArtifactType = 'attack' | 'defense' | 'hp' | 'support'
export type ArtifactAttribute = 'fire' | 'water' | 'wind' | 'light' | 'dark'

export type ArtifactMainStat = 'atk' | 'def' | 'hp' // always flat

export type ArtifactQuality = 'normal' | 'magic' | 'rare' | 'hero' | 'legend'

// Artifact substats are UNIQUE — different from rune substats
// They are conditional/skill-specific effects
export type ArtifactSubstatType =
  | 'dmg-to-fire' | 'dmg-to-water' | 'dmg-to-wind' | 'dmg-to-light' | 'dmg-to-dark'
  | 'dmg-from-fire' | 'dmg-from-water' | 'dmg-from-wind' | 'dmg-from-light' | 'dmg-from-dark'
  | 'skill1-cd' | 'skill2-cd' | 'skill3-cd' | 'skill4-cd'
  | 'skill1-recovery' | 'skill2-recovery' | 'skill3-recovery'
  | 'skill1-accuracy' | 'skill2-accuracy' | 'skill3-accuracy'
  | 'crit-dmg-single' | 'crit-dmg-aoe'
  | 'hp-lost-atk' | 'hp-lost-def' | 'hp-lost-spd'
  | 'spd-under-hp-threshold'
  | 'life-drain' | 'counter-dmg' | 'coop-dmg' | 'bomb-dmg'
  | 'dmg-reduction-single' | 'dmg-reduction-aoe'
  | 'additional-dmg-by-hp' | 'additional-dmg-by-atk' | 'additional-dmg-by-def' | 'additional-dmg-by-spd'
  | 'recovery-hp' | 'recovery-ally'
  | 'shield'

export interface ArtifactStat {
  type: ArtifactSubstatType
  value: number // percentage value
}

export interface ArtifactData {
  category: ArtifactCategory // 'type' or 'attribute'
  artifactType?: ArtifactType // if category = 'type'
  artifactAttribute?: ArtifactAttribute // if category = 'attribute'
  quality?: ArtifactQuality
  level: number // 0-15
  mainStat: { type: ArtifactMainStat; value: number }
  subStats: ArtifactStat[]
}
