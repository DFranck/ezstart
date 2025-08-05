import { DEFAULT_GOLD, DEFAULT_HP, DEFAULT_INCOME, DEFAULT_PLAYER_STATUS } from '@tower-defense/config'
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
    status: DEFAULT_PLAYER_STATUS,
    hp: DEFAULT_HP,
    income: DEFAULT_INCOME,
    gold: DEFAULT_GOLD,
    hand: [],
    placedTowers: [],
    incomingUnits: [],
  }
}
