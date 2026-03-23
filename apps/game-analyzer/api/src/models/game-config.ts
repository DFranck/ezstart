import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'

export interface GameConfig {
  gameType: string
  bestPresets: string[]
  zones: any
  masks: any
  updatedAt: Date
}

const gameConfigSchema = new Schema<GameConfig>(
  {
    gameType: { type: String, required: true, unique: true },
    bestPresets: [String],
    zones: { type: Schema.Types.Mixed },
    masks: { type: Schema.Types.Mixed },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    bufferCommands: false,
  }
)

/**
 * Factory function to get GameConfig model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getGameConfigModel() {
  const mongoose = await connectToMongo('game-analyzer')
  return mongoose.models.GameConfig || mongoose.model<GameConfig>('GameConfig', gameConfigSchema)
}
