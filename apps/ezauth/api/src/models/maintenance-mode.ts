import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Mongoose document for the singleton maintenance-mode toggle.
 *
 * The maintenance mode is platform-wide — when `enabled === true`, every
 * consumer app SHOULD show a banner (via `<MaintenanceBanner>` from
 * `@ezstart/auth-sdk/components`) warning users that the platform is in
 * maintenance and that operations may be degraded.
 *
 * This is a singleton document — the route layer enforces a single document
 * per database (the GET endpoint always upserts the singleton on first read,
 * the PUT endpoint updates the singleton in-place).
 *
 * `message` is the free-form string shown in the banner. Defaults to a
 * generic English fallback when empty.
 *
 * `scheduledEnd` is an OPTIONAL ISO date that the banner can display so users
 * know when service is expected to resume. If absent, the banner shows the
 * message without an ETA.
 *
 * `startedAt` is automatically set to `new Date()` on the FIRST flip from
 * `false → true`, and reset to `null` whenever maintenance is turned off.
 */
export interface MaintenanceModeDocument extends Document {
  /** Singleton key — always `'singleton'`. */
  singleton: 'singleton'
  enabled: boolean
  message: string
  startedAt: Date | null
  scheduledEnd: Date | null
  /** Provenance — userId of the last admin to flip it, or `'system-seed'`. */
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const maintenanceModeSchema = new Schema<MaintenanceModeDocument>(
  {
    singleton: {
      type: String,
      enum: ['singleton'],
      required: true,
      default: 'singleton',
      unique: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    message: {
      type: String,
      required: false,
      default: '',
      maxlength: 1000,
      trim: true,
    },
    startedAt: {
      type: Date,
      required: false,
      default: null,
    },
    scheduledEnd: {
      type: Date,
      required: false,
      default: null,
    },
    updatedBy: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'maintenance_mode',
    bufferCommands: false,
  }
)

/**
 * Factory function to get the MaintenanceMode model attached to the shared
 * ezauth connection. Safe to call multiple times.
 *
 * @example
 * const MaintenanceMode = await getMaintenanceModeModel()
 * const status = await MaintenanceMode.findOne({ singleton: 'singleton' })
 */
export async function getMaintenanceModeModel(): Promise<Model<MaintenanceModeDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.MaintenanceMode ||
    mongoose.model<MaintenanceModeDocument>('MaintenanceMode', maintenanceModeSchema)
  )
}

/**
 * Read-or-create the singleton maintenance-mode document.
 * Used by both admin GET and the public maintenance-status route.
 *
 * @internal
 */
export async function getOrCreateMaintenanceMode(): Promise<MaintenanceModeDocument> {
  const MaintenanceMode = await getMaintenanceModeModel()
  let doc = await MaintenanceMode.findOne({ singleton: 'singleton' })
  if (!doc) {
    doc = await MaintenanceMode.create({
      singleton: 'singleton',
      enabled: false,
      message: '',
      startedAt: null,
      scheduledEnd: null,
    })
  }
  return doc
}
