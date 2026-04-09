import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

export interface IQRCode {
  userId: string
  userEmail?: string
  url: string
  title?: string
  redirectType: 'permanent' | 'temporary'
  size: number
  foreground: string
  background: string
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  includeMargin: boolean
  scansCount: number
  createdAt: Date
  updatedAt: Date
}

const qrCodeSchema = new Schema<IQRCode>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
    },
    url: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    title: {
      type: String,
      maxlength: 200,
    },
    redirectType: {
      type: String,
      enum: ['permanent', 'temporary'],
      default: 'permanent',
    },
    size: {
      type: Number,
      min: 128,
      max: 512,
      default: 256,
    },
    foreground: {
      type: String,
      default: '#000000',
      maxlength: 7,
    },
    background: {
      type: String,
      default: '#ffffff',
      maxlength: 7,
    },
    errorCorrection: {
      type: String,
      enum: ['L', 'M', 'Q', 'H'],
      default: 'M',
    },
    includeMargin: {
      type: Boolean,
      default: true,
    },
    scansCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
)

// Indexes for efficient querying
qrCodeSchema.index({ userId: 1, createdAt: -1 })
qrCodeSchema.index({ createdAt: -1 })

export const QRCode = models.QRCode || model<IQRCode>('QRCode', qrCodeSchema)
