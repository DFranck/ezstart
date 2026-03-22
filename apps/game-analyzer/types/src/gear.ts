export type GearType = 'helm' | 'gloves' | 'chest' | 'boots'

export type Manufacturer =
  | 'elysion'
  | 'missilis'
  | 'tetra'
  | 'pilgrim'
  | 'abnormal'

export type GearStatType =
  | 'atk'
  | 'atk%'
  | 'def'
  | 'def%'
  | 'hp'
  | 'hp%'
  | 'crit-rate'
  | 'crit-dmg'
  | 'charge-spd'
  | 'charge-dmg'
  | 'element-dmg'
  | 'hit-rate'
  | 'ammo'

export interface GearStat {
  type: GearStatType
  value: number
}

export interface GearData {
  type: GearType
  manufacturer: Manufacturer
  level: number
  tier: number
  mainStat: GearStat
  subStats: GearStat[]
}
