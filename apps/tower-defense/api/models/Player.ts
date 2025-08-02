import { Schema, model } from 'mongoose'

const playerSchema = new Schema(
  {
    userId: { type: String, required: false, unique: true, sparse: true },
    name: { type: String, required: true, unique: true },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    rank: { type: Number, default: 1000 },
    // Plus tard : userId: ObjectId, email, etc.
  },
  { timestamps: true }
)

export const PlayerModel = model('Player', playerSchema)
