import { Schema, model } from 'mongoose';

const gameSchema = new Schema(
  {
    players: [{ type: Schema.Types.ObjectId, ref: 'Player', required: true }],
    tick: { type: Number, default: 0 },
    map: { type: [[String]], required: true },
    shop: [
      {
        id: String,
        unit: {
          id: String,
          type: {
            type: String,
            enum: ['archer', 'bomb', 'ice'],
            required: true,
          },
          damage: Number,
          range: Number,
          cost: Number,
        },
        price: Number,
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
