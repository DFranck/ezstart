// models/Player.ts
import { Schema, model } from 'mongoose';

const playerSchema = new Schema(
  {
    name: { type: String, required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game' },
  },
  { timestamps: true }
);

export const Player = model('Player', playerSchema);
