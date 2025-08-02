import { model, Schema } from 'mongoose';

export const mobSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: ['goblin', 'wolf', 'boss'], required: true },
    hp: { type: Number, required: true },
    speed: { type: Number, required: true },
    effects: {
      type: ['poisoned', 'burning', 'invisible', 'healed'],
      required: false,
    },
  },
  { _id: false }
);

export const Mob = model('Mob', mobSchema);
