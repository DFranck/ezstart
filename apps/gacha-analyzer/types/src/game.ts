export type GameType = 'summoners-war' | 'nikke'

export interface GameConfig {
  gameType: GameType
  displayName: string
  icon: string
}
