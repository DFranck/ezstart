// models/Player.ts
import { Schema, model } from 'mongoose';
import { mobSchema } from './Mob';
import { towerSchema } from './Tower';

export const playerSchema = new Schema(
  {
    id: { type: String, required: true }, // pour correspondre à Zod
    name: { type: String, required: true },
    gold: { type: Number, required: true },
    income: { type: Number, required: true },
    hp: { type: Number, required: true },
    hand: { type: [towerSchema], required: true, default: [] },
    placedTowers: { type: [towerSchema], required: true, default: [] },
    incomingUnits: { type: [mobSchema], required: true, default: [] },
  },
  { timestamps: true }
);

export const Player = model('Player', playerSchema);
