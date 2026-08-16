import { connectToMongo } from '@ezstart/api-core'
import { Schema, Document, Model } from 'mongoose'
import { testModeScopePlugin } from '../middleware/test-mode-scope.js'

export interface AuthCodeDocument extends Document {
  code: string
  userId: string
  app: string
  type: 'auth' | 'password-reset' | 'email-verification' | 'sso-handoff'
  redirectUri?: string
  /**
   * PKCE (RFC 7636 / OAuth 2.1) — when the client committed to a PKCE flow,
   * this stores `BASE64URL(SHA256(code_verifier))`. The /token exchange then
   * REQUIRES a matching `code_verifier`. Absent ⇒ legacy (no-PKCE) code that
   * exchanges without a verifier (magic-link, sso-handoff, 2FA, legacy login).
   */
  codeChallenge?: string
  /** PKCE method — only `'S256'` is ever stored (plain is rejected upstream). */
  codeChallengeMethod?: 'S256'
  expiresAt: Date
  isUsed: boolean
  consumedAt?: Date
  issuedFromIp?: string
  issuedUa?: string
  /**
   * Stripe-pattern test/live partition. SSO handoff codes issued via a test
   * key cannot be redeemed for a live session and vice-versa.
   */
  isTestMode: boolean
  createdAt: Date
  updatedAt: Date
}

const authCodeSchema = new Schema<AuthCodeDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['auth', 'password-reset', 'email-verification', 'sso-handoff'],
      default: 'auth',
    },
    app: {
      type: String,
      required: true,
      enum: [
        'ezbill',
        'ezauth',
        'admin',
        'ezstart',
        'green-pulse',
        'fengshui',
        'asc-tcd',
        'gacha-analyzer',
        'ezpay',
      ],
    },
    redirectUri: {
      type: String,
    },
    // PKCE (RFC 7636) — stored only when the client opted into PKCE. The
    // exchange binds `BASE64URL(SHA256(code_verifier))` against this value
    // with a timing-safe compare. See `auth.service.ts` exchangeCodeForToken.
    codeChallenge: {
      type: String,
    },
    codeChallengeMethod: {
      type: String,
      enum: ['S256'],
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    consumedAt: {
      type: Date,
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
    collection: 'auth_codes',
    bufferCommands: false, // Disable buffering for fail-fast
  }
)

// Auto-expire codes
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Stripe-pattern test/live partition (`standard-saas-data.md` §4).
authCodeSchema.plugin(testModeScopePlugin)

/**
 * Factory function to get AuthCode model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getAuthCodeModel(): Promise<Model<AuthCodeDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.AuthCode || mongoose.model<AuthCodeDocument>('AuthCode', authCodeSchema)
}
