import { EFFECTS, ELEMENTAL_TYPES } from '@tower-defense/config'
import { model, Schema } from 'mongoose'

export const mobSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    elementalType: { type: String, enum: ELEMENTAL_TYPES, required: true },
    hp: { type: Number, required: true },
    speed: { type: Number, required: true },
    effects: { type: [String], enum: EFFECTS },
  },
  { _id: false }
)

export const Mob = model('Mob', mobSchema)
