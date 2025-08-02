import { Schema } from 'mongoose'
import { mobSchema } from './Mob'
import { towerSchema } from './Tower'

export const gamePlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true },
    gold: { type: Number, required: true },
    income: { type: Number, required: true },
    hp: { type: Number, required: true },
    hand: { type: [towerSchema], required: true, default: [] },
    placedTowers: { type: [towerSchema], required: true, default: [] },
    incomingUnits: { type: [mobSchema], required: true, default: [] },
  },
  { _id: false }
)
