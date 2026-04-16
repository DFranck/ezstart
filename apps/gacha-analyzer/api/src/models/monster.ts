import { connectToMongo } from '@ezstart/api-core'
import { Schema } from 'mongoose'
import type { Monster } from '@gacha-analyzer/types'

const leaderSkillSchema = new Schema(
  {
    attribute: { type: String, required: true },
    amount: { type: Number, required: true },
    area: { type: String, required: true },
  },
  { _id: false }
)

const monsterSchema = new Schema<Monster>(
  {
    id: { type: Number, required: true, unique: true },
    com2usId: { type: Number, required: true },
    name: { type: String, required: true, index: true },
    familyId: { type: Number, required: true },
    element: {
      type: String,
      enum: ['fire', 'water', 'wind', 'light', 'dark'],
      required: true,
      index: true,
    },
    archetype: {
      type: String,
      enum: ['attack', 'defense', 'support', 'hp'],
      required: true,
    },
    naturalStars: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    imageFilename: { type: String, required: true },
    baseHp: { type: Number, required: true },
    baseAttack: { type: Number, required: true },
    baseDefense: { type: Number, required: true },
    speed: { type: Number, required: true },
    critRate: { type: Number, required: true },
    critDamage: { type: Number, required: true },
    resistance: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    buildArchetypes: { type: [String], required: true, index: true },
    scalesWith: { type: [String], required: true },
    leaderSkill: { type: leaderSkillSchema },
    obtainable: { type: Boolean, required: true },
    awakenLevel: { type: Number, required: true },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Compound indexes for efficient queries
monsterSchema.index({ element: 1, naturalStars: -1 })
monsterSchema.index({ buildArchetypes: 1, element: 1 })

/**
 * Factory function to get Monster model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getMonsterModel() {
  const mongoose = await connectToMongo('game-analyzer')
  return mongoose.models.Monster || mongoose.model<Monster>('Monster', monsterSchema)
}
