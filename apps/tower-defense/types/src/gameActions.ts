import { Tower } from './tower.js'
export type GameAction = 
  | {
      type: 'placeTower'
      payload: {
        x: number
        y: number
        towerType: Tower
        playerId: string
      }
    }
  | {
      type: 'takeDamage'
      payload: {
        playerId: string
        damage: number
      }
    }
