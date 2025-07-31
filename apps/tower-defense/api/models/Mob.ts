import { model, Schema } from 'mongoose';

export const mobSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    hp: { type: Number, required: true },
    speed: { type: Number, required: true },
    effects: { type: [String], required: false },
  },
  { _id: false }
);

export const Mob = model('Mob', mobSchema);
