export const GAME_PHASES = ['waiting', 'playing', 'finished'] as const
export type GamePhase = (typeof GAME_PHASES)[number]
export const DEFAULT_PHASE: GamePhase = 'waiting'
export const DEFAULT_HP = 20
export const DEFAULT_INCOME = 10
export const DEFAULT_GOLD = 50
