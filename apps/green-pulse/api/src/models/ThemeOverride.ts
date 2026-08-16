import { connectToMongo } from '@ezstart/api-core'
import { Schema } from 'mongoose'

export interface ThemeOverride {
  _id?: string
  appName: string
  overrides: Record<string, string>
  updatedAt: Date
  updatedBy?: string
}

const themeOverrideSchema = new Schema<ThemeOverride>(
  {
    appName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    overrides: {
      type: Map,
      of: String,
      required: true,
      default: {},
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: String,
  },
  {
    timestamps: true,
    collection: 'theme_overrides',
  }
)

export async function getThemeOverrideModel() {
  const mongoose = await connectToMongo('green-pulse')
  return (
    mongoose.models.ThemeOverride ||
    mongoose.model<ThemeOverride>('ThemeOverride', themeOverrideSchema)
  )
}
