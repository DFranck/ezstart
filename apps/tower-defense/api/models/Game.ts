import { Schema, model } from 'mongoose';
import { mobSchema } from './Mob';
import { towerSchema } from './Tower';

const gameSchema = new Schema(
  {
    players: [{ type: Schema.Types.ObjectId, ref: 'Player', required: true }],
    tick: { type: Number, default: 0 },
    map: { type: [[String]], required: true },
    shop: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ['tower', 'unit'], required: true },
        price: { type: Number, required: true },
        tower: {
          type: towerSchema,
          required: false,
        },
        unit: {
          type: mobSchema,
          required: false,
        },
      },
    ],

    phase: {
      type: String,
      enum: ['waiting', 'playing', 'finished'],
      default: 'waiting',
    },
  },
  { timestamps: true }
);

export const Game = model('Game', gameSchema);
