export const PLAYER_STATUS = ['active', 'eliminated', 'disconnected', 'left'] as const
export const DEFAULT_PLAYER_STATUS = 'active'
export type PlayerStatus = (typeof PLAYER_STATUS)[number]
