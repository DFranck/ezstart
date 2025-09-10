import { EFFECTS, TARGETING_STRATEGIES } from '@tower-defense/config'
import { model, Schema } from 'mongoose'

export const towerSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, minlength: 1, maxlength: 50 },
    elementalType: { type: String, required: true }, // fire, water, earth, etc.
    damage: { type: Number, required: true, min: 1, max: 500 },
    damageType: { type: String, required: true }, // single, splash
    speed: { type: Number, required: true, min: 0.1, max: 3 },
    range: { type: Number, required: true, min: 1, max: 10 },
    shape: { type: [[Boolean]], required: true }, // 2D array of booleans
    splashRadius: { type: Number, min: 0, max: 5 },
    effect: { type: String, enum: EFFECTS },
    targetingStrategy: { type: String, enum: TARGETING_STRATEGIES },
    description: { type: String, maxlength: 200 },
  },
  { _id: false }
)

export const Tower = model('Tower', towerSchema)
