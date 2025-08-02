import { DEFAULT_GOLD, DEFAULT_HP, DEFAULT_INCOME } from '@tower-defense/config/src/gamePhases'
import { GamePlayer } from '@tower-defense/types/game-player'
import { Types } from 'mongoose'

export function createDefaultGamePlayer({
  playerId,
  name,
}: {
  playerId: Types.ObjectId
  name: string
}): GamePlayer {
  return {
    playerId: playerId.toString(),
    name,
    hp: DEFAULT_HP,
    income: DEFAULT_INCOME,
    gold: DEFAULT_GOLD,
    hand: [],
    placedTowers: [],
    incomingUnits: [],
  }
}
