import { DEFAULT_PLAYER_STATUS, PLAYER_STATUS } from '@tower-defense/config'
import { Schema, model } from 'mongoose'
import { mobSchema } from './Mob.js'
import { placedTowerSchema } from './PlacedTower.js'
import { towerSchema } from './Tower.js'

const inGamePlayerSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
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
  { timestamps: true }
)

// Index composé pour s'assurer qu'un joueur ne peut être qu'une fois dans une partie
inGamePlayerSchema.index({ gameId: 1, player: 1 }, { unique: true })

export const InGamePlayerModel = model('InGamePlayer', inGamePlayerSchema)
