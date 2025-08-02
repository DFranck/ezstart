export const GAME_PHASES = ['waiting', 'playing', 'finished'] as const;
export type GamePhase = (typeof GAME_PHASES)[number];
export const DEFAULT_PHASE: GamePhase = 'waiting';
