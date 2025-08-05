import { DEFAULT_PLAYER_STATUS, PLAYER_STATUS } from '@tower-defense/config'
import { Schema } from 'mongoose'
import { mobSchema } from './Mob'
import { placedTowerSchema } from './PlacedTower'
import { towerSchema } from './Tower'

export const gamePlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: PLAYER_STATUS,
      required: true,
      default: DEFAULT_PLAYER_STATUS,
    },
    gold: { type: Number, required: true },
    income: { type: Number, required: true },
    hp: { type: Number, required: true },
    hand: { type: [towerSchema], required: true, default: [] },
    placedTowers: { type: [placedTowerSchema], required: true, default: [] },
    incomingUnits: { type: [mobSchema], required: true, default: [] },
  },
  { _id: false }
)
