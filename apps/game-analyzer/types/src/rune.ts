export type RuneSet =
  | 'violent'
  | 'swift'
  | 'rage'
  | 'fatal'
  | 'despair'
  | 'blade'
  | 'focus'
  | 'guard'
  | 'energy'
  | 'endure'
  | 'shield'
  | 'revenge'
  | 'will'
  | 'nemesis'
  | 'vampire'
  | 'destroy'
  | 'fight'
  | 'determination'
  | 'enhance'
  | 'accuracy'
  | 'tolerance'
  | 'cruel'

export type RuneSlot = 1 | 2 | 3 | 4 | 5 | 6

export type StatType =
  | 'hp'
  | 'hp%'
  | 'atk'
  | 'atk%'
  | 'def'
  | 'def%'
  | 'spd'
  | 'cr'
  | 'cd'
  | 'res'
  | 'acc'

export interface RuneStat {
  type: StatType
  value: number
}

export interface RuneData {
  set: RuneSet
  slot: RuneSlot
  grade: number
  level: number
  mainStat: RuneStat
  subStats: RuneStat[]
  innateStat?: RuneStat
}
