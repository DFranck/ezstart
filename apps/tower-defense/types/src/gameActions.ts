import { Tower } from './tower'
export type GameAction = {
  type: 'placeTower'
  payload: {
    x: number
    y: number
    towerType: Tower
    playerId: string
  }
}
