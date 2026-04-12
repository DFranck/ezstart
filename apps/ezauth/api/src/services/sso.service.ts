/**
 * SSO Handoff Service
 *
 * Implements a short-lived, single-use authorization code exchange so that an
 * already-authenticated user on one ezstart.xyz app can transparently obtain
 * a session on another app without re-entering credentials.
 *
 * Flow:
 *   1. Authenticated client calls POST /api/auth/sso/authorize with
 *      { app, redirectUri } → receives a 60s single-use code.
 *   2. Client navigates to the target app's callback URL with the code.
 *   3. Callback page calls POST /api/auth/sso/exchange with { code, app } →
 *      server atomically marks the code consumed and issues fresh cookies.
 *
 * Security:
 *   - Code is 32 random bytes (base64url)
 *   - 60s TTL (enforced via expiresAt index + query)
 *   - Single-use (atomic findOneAndUpdate)
 *   - redirectUri validated against SSO_ALLOWED_REDIRECTS allowlist (origin match)
 */

import crypto from 'crypto'
import { logger } from '@ezstart/logger/server'
import { getAuthCodeModel } from '../models/auth-code.js'

const HANDOFF_TTL_SECONDS = 60

/**
 * Parse SSO_ALLOWED_REDIRECTS env var into a list of allowed origins.
 * Expected format: comma-separated URLs (origin-only fragments or full URLs).
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.SSO_ALLOWED_REDIRECTS || ''
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      try {
        return new URL(entry).origin
      } catch {
        return entry // fallback for bare origins
      }
    })
}

/**
 * Validate that redirectUri's origin is in the allowlist.
 * Throws on invalid URL or disallowed origin.
 */
function validateRedirectUri(redirectUri: string): URL {
  let parsed: URL
  try {
    parsed = new URL(redirectUri)
  } catch {
    throw new Error('Invalid redirectUri: not a valid URL')
  }

  const allowed = getAllowedOrigins()
  if (allowed.length === 0) {
    throw new Error('SSO is not configured: SSO_ALLOWED_REDIRECTS is empty')
  }

  if (!allowed.includes(parsed.origin)) {
    throw new Error(`Disallowed redirectUri origin: ${parsed.origin}`)
  }

  return parsed
}

export interface IssueHandoffParams {
  userId: string
  app: string
  redirectUri: string
  ip?: string
  ua?: string
}

export interface IssueHandoffResult {
  code: string
  expiresIn: number
}

/**
 * Issue a single-use SSO handoff code for an authenticated user.
 */
export async function issueHandoffCode(params: IssueHandoffParams): Promise<IssueHandoffResult> {
  const { userId, app, redirectUri, ip, ua } = params

  // Validate redirect origin against allowlist before persisting anything
  validateRedirectUri(redirectUri)

  const AuthCodeModel = await getAuthCodeModel()
  const code = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000)

  await AuthCodeModel.create({
    code,
    userId,
    app,
    type: 'sso-handoff',
    redirectUri,
    expiresAt,
    isUsed: false,
    issuedFromIp: ip,
    issuedUa: ua,
  })

  logger.info({ userId, app }, 'SSO handoff issued')

  return { code, expiresIn: HANDOFF_TTL_SECONDS }
}

export interface ConsumedHandoffCode {
  userId: string
  app: string
  redirectUri?: string
}

/**
 * Atomically consume a single-use SSO handoff code.
 * Returns the userId + original redirectUri so the caller can issue a session
 * and compute the final redirect path.
 */
export async function consumeHandoffCode(params: {
  code: string
  app: string
}): Promise<ConsumedHandoffCode> {
  const { code, app } = params

  const AuthCodeModel = await getAuthCodeModel()

  const consumed = await AuthCodeModel.findOneAndUpdate(
    {
      code,
      type: 'sso-handoff',
      isUsed: false,
      expiresAt: { $gt: new Date() },
      app,
    },
    {
      $set: { isUsed: true, consumedAt: new Date() },
    },
    { new: true }
  )

  if (!consumed) {
    logger.warn({ app }, 'SSO handoff failed: invalid/expired/used code')
    throw new Error('Invalid or expired authorization code')
  }

  logger.info({ userId: consumed.userId, app: consumed.app }, 'SSO handoff consumed')

  return {
    userId: consumed.userId,
    app: consumed.app,
    redirectUri: consumed.redirectUri,
  }
}
