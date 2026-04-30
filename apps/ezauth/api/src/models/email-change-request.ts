import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'

/**
 * Email change request — issued when an authenticated user requests to
 * change their email address. The token is sent to the NEW email address;
 * clicking the verify link consumes the request and updates the account.
 *
 * Lifecycle:
 *   1. User authenticates + POST /api/auth/change-email { newEmail }
 *      -> creates an EmailChangeRequest + sends verification email
 *   2. User clicks the link in the new email
 *      -> POST /api/auth/email-change/verify { token }
 *      -> consumes request, updates user.email, revokes refresh tokens
 *   3. After 24h the request expires (TTL index on `expiresAt`).
 *
 * Standard ref: `.claude/rules/standard-saas-security.md` §6 (token replay
 * protection, idempotency).
 */
export interface EmailChangeRequestDocument extends Document {
  userId: string
  /** Old email at time of request (audit + verify confirmation). */
  oldEmail: string
  /** New email being requested (lowercase, trimmed). */
  newEmail: string
  /** Random opaque token (32 bytes hex) used in the verification link. */
  token: string
  /** Whether the token has already been consumed. */
  isUsed: boolean
  consumedAt?: Date
  expiresAt: Date
  /** Source IP of the change request (audit). */
  issuedFromIp?: string
  /** User-Agent of the change request (audit). */
  issuedUa?: string
  createdAt: Date
  updatedAt: Date
}

const emailChangeRequestSchema = new Schema<EmailChangeRequestDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    oldEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    newEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    consumedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      // 24h default — the route overrides anyway, but this keeps the schema
      // self-documenting.
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    issuedFromIp: {
      type: String,
    },
    issuedUa: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'email_change_requests',
    bufferCommands: false,
  }
)

// Auto-expire requests via Mongo TTL index — reclaims storage and
// prevents stale tokens from accumulating.
emailChangeRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

/**
 * Factory function to get the EmailChangeRequest model attached to the
 * shared Mongo connection. MUST be called after `connectToMongo()` has
 * been initialized.
 */
export async function getEmailChangeRequestModel(): Promise<Model<EmailChangeRequestDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.EmailChangeRequest ||
    mongoose.model<EmailChangeRequestDocument>('EmailChangeRequest', emailChangeRequestSchema)
  )
}
