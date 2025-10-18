import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

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

const healthCheckSchema = new Schema<IHealthCheck>({
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
    index: true, // Index for time-based queries
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
})

// Compound index for efficient queries
healthCheckSchema.index({ serviceId: 1, timestamp: -1 })

// TTL index to auto-delete old records after 30 days
healthCheckSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const HealthCheck = models.HealthCheck || model<IHealthCheck>('HealthCheck', healthCheckSchema)
