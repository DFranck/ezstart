import {
  DEFAULT_GOLD,
  DEFAULT_HP,
  DEFAULT_INCOME,
  DEFAULT_PLAYER_STATUS,
  TIER_SYSTEM,
} from '@tower-defense/config'
import { Types } from 'mongoose'

export function createDefaultGamePlayer({
  playerId,
  name,
}: {
  playerId: Types.ObjectId
  name: string
}) {
  return {
    status: DEFAULT_PLAYER_STATUS,
    hp: DEFAULT_HP,
    income: DEFAULT_INCOME,
    gold: DEFAULT_GOLD,
    tier: TIER_SYSTEM.STARTING_TIER,
    goldSpent: 0,
    hand: [],
    placedTowers: [],
    incomingUnits: [],
  }
}
