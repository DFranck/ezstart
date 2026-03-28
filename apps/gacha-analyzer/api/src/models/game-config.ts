import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'

export interface GameConfig {
  gameType: string
  layoutName: string
  displayName?: string
  bestPresets: string[]
  zones: any
  masks: any
  roi: any
  updatedAt: Date
}

const gameConfigSchema = new Schema<GameConfig>(
  {
    gameType: { type: String, required: true },
    layoutName: { type: String, required: true },
    displayName: { type: String },
    bestPresets: [String],
    zones: { type: Schema.Types.Mixed },
    masks: { type: Schema.Types.Mixed },
    roi: { type: Schema.Types.Mixed },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    bufferCommands: false,
  }
)

gameConfigSchema.index({ gameType: 1, layoutName: 1 }, { unique: true })

/**
 * Factory function to get GameConfig model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getGameConfigModel() {
  const mongoose = await connectToMongo('game-analyzer')
  return mongoose.models.GameConfig || mongoose.model<GameConfig>('GameConfig', gameConfigSchema)
}
