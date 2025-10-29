import { connectToMongo } from '@ezstart/express-core'
import { Schema, Model } from 'mongoose'

export interface IHealthCheck {
  serviceId: string // 'ezauth-api', 'ezauth-web', etc.
  status: 'healthy' | 'unhealthy'
  responseTime: number | null // ms
  timestamp: Date
  error?: string | null
  metadata?: {
    statusCode?: number
    statusText?: string
  }
}

const healthCheckSchema = new Schema<IHealthCheck>(
  {
    serviceId: {
      type: String,
      required: true,
      index: true, // Index for fast queries
    },
    status: {
      type: String,
      required: true,
      enum: ['healthy', 'unhealthy'],
    },
    responseTime: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      required: true,
      // Index created via schema.index() below for TTL and compound index
      default: Date.now,
    },
    error: {
      type: String,
      default: null,
    },
    metadata: {
      statusCode: Number,
      statusText: String,
    },
  },
  {
    // Disable buffering for fail-fast behavior
    bufferCommands: false,
  }
)

// Compound index for efficient queries
healthCheckSchema.index({ serviceId: 1, timestamp: -1 })

// TTL index to auto-delete old records after 30 days
healthCheckSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

/**
 * Factory function to get HealthCheck model attached to shared mongoose connection
 * MUST be called after connectToMongo() has been initialized
 *
 * Usage:
 * ```typescript
 * const HealthCheck = await getHealthCheckModel()
 * await HealthCheck.create({...})
 * ```
 */
export async function getHealthCheckModel(): Promise<Model<IHealthCheck>> {
  const mongoose = await connectToMongo('ezstart-monitoring')
  return mongoose.models.HealthCheck || mongoose.model<IHealthCheck>('HealthCheck', healthCheckSchema)
}
