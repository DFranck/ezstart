import { model, Schema } from 'mongoose';

export const towerSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    damage: { type: Number, required: true },
    range: { type: Number, required: true },
  },
  { _id: false }
);

export const Tower = model('Tower', towerSchema);
