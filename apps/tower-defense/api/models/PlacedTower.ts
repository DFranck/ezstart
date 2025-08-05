import { Schema } from 'mongoose'
import { positionSchema } from './Position'
import { towerSchema } from './Tower'
export const placedTowerSchema = new Schema(
  {
    ...towerSchema.obj,
    origin: { type: positionSchema, required: true },
    coveredCells: { type: [positionSchema], required: true },
  },
  { _id: false }
)
