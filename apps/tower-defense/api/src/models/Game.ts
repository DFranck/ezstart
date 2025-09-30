import { DEFAULT_PHASE, GAME_PHASES } from '@tower-defense/config'
import { Schema, model } from 'mongoose'
import { mobSchema } from './Mob.js'
import { towerSchema } from './Tower.js'

const gameSchema = new Schema(
  {
    host: { type: Schema.Types.ObjectId, ref: 'Player', required: false },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player', required: true }],
    tick: { type: Number, default: 0 },
    map: { type: [[String]], required: true },
    shopTowers: [
      {
        price: { type: Number, required: true },
        tower: towerSchema,
      },
    ],
    shopUnits: [
      {
        price: { type: Number, required: true },
        unit: mobSchema,
      },
    ],
    phase: {
      type: String,
      enum: GAME_PHASES,
      default: DEFAULT_PHASE,
    },
    isSoloMode: { type: Boolean, default: false },
    startedAt: { type: Date, required: false },
  },
  { timestamps: true }
)

export const GameModel = model('Game', gameSchema)
