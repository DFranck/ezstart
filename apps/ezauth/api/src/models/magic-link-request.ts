import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'
import { testModeScopePlugin } from '../middleware/test-mode-scope.js'

/**
 * Magic link request — passwordless login flow. The user enters their
 * email; if the account exists, a one-shot link is sent. Clicking the
 * link issues a session (cookies + refresh token).
 *
 * Lifecycle:
 *   1. POST /api/auth/magic-link/request { email, app, redirect_uri? }
 *      -> creates a MagicLinkRequest if the user exists (anti-enumeration:
 *      always returns 200)
 *   2. User clicks the link in the email
 *      -> GET /api/auth/magic-link/verify?token=...
 *      -> consumes request, issues session via cookies, redirects
 *   3. After 15 minutes the request expires (TTL index on `expiresAt`).
 *
 * Standard ref: `.claude/rules/standard-saas-security.md` §6 (token replay
 * protection).
 */
export interface MagicLinkRequestDocument extends Document {
  userId: string
  /** Email used to request the link (audit). */
  email: string
  /** App context for the session issuance + post-login redirect. */
  app: string
  /** Optional override redirect URI honored on verify. */
  redirectUri?: string
  /** Random opaque token (32 bytes hex) used in the magic link. */
  token: string
  /** Whether the token has already been consumed. */
  isUsed: boolean
  consumedAt?: Date
  expiresAt: Date
  /** Source IP of the request (audit). */
  issuedFromIp?: string
  /** User-Agent of the request (audit). */
  issuedUa?: string
  /**
   * Stripe-pattern test/live partition. Inherited from `req.derivedMode` at
   * issue time so test mode magic links cannot consume live sessions.
   */
  isTestMode: boolean
  createdAt: Date
  updatedAt: Date
}

const magicLinkRequestSchema = new Schema<MagicLinkRequestDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    app: {
      type: String,
      required: true,
    },
    redirectUri: {
      type: String,
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
      // 15 min default — short window because magic links are equivalent
      // to a one-shot password.
      default: () => new Date(Date.now() + 15 * 60 * 1000),
    },
    issuedFromIp: {
      type: String,
    },
    issuedUa: {
      type: String,
    },
    isTestMode: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'magic_link_requests',
    bufferCommands: false,
  }
)

// Auto-expire requests via Mongo TTL index.
magicLinkRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Stripe-pattern test/live partition (`standard-saas-data.md` §4).
magicLinkRequestSchema.plugin(testModeScopePlugin)

/**
 * Factory function to get the MagicLinkRequest model attached to the
 * shared Mongo connection. MUST be called after `connectToMongo()` has
 * been initialized.
 */
export async function getMagicLinkRequestModel(): Promise<Model<MagicLinkRequestDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.MagicLinkRequest ||
    mongoose.model<MagicLinkRequestDocument>('MagicLinkRequest', magicLinkRequestSchema)
  )
}
