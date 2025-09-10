import { Schema } from 'mongoose'
import { positionSchema } from './Position.js'
import { towerSchema } from './Tower.js'
export const placedTowerSchema = new Schema(
  {
    ...towerSchema.obj,
    origin: { type: positionSchema, required: true },
    coveredCells: { type: [positionSchema], required: true },
  },
  { _id: false }
)
