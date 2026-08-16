import { connectToMongo } from '@ezstart/api-core'
import { Schema, Model } from 'mongoose'

export interface IPerformanceMetric {
  serviceId: string // 'ezauth-api', 'ezauth-web', etc.
  metricType: 'api_response_time' | 'db_query' | 'external_api' | 'page_load'
  endpoint?: string // '/api/auth/login' or page route
  duration: number // ms
  timestamp: Date
  status: 'success' | 'error'
  metadata?: {
    method?: string // GET, POST, etc.
    statusCode?: number
    errorMessage?: string
    userId?: string
    [key: string]: unknown
  }
}

const performanceMetricSchema = new Schema<IPerformanceMetric>(
  {
    serviceId: {
      type: String,
      required: true,
      index: true,
    },
    metricType: {
      type: String,
      required: true,
      enum: ['api_response_time', 'db_query', 'external_api', 'page_load'],
      index: true,
    },
    endpoint: {
      type: String,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'error'],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    bufferCommands: false,
  }
)

// Compound indexes for efficient queries
performanceMetricSchema.index({ serviceId: 1, timestamp: -1 })
performanceMetricSchema.index({ serviceId: 1, metricType: 1, timestamp: -1 })
performanceMetricSchema.index({ endpoint: 1, timestamp: -1 })

// TTL index to auto-delete old metrics after 7 days (save space)
performanceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 })

export async function getPerformanceMetricModel(): Promise<Model<IPerformanceMetric>> {
  const mongoose = await connectToMongo('ezstart')
  return (
    mongoose.models.PerformanceMetric ||
    mongoose.model<IPerformanceMetric>('PerformanceMetric', performanceMetricSchema)
  )
}
