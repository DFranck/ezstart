/**
 * POST /api/subscriptions/webhook — cross-service receiver for EZPay
 * subscription lifecycle events.
 *
 * Auth (two layers):
 *   1. `X-API-Key` — must be an active EZAuth API key with `scope: 'admin'`.
 *   2. `X-EZStart-Signature` — HMAC-SHA256 over `"{timestamp}.{body}"` using
 *      the shared `EZAUTH_WEBHOOK_SECRET`. Protects against key leak AND
 *      against downstream tampering once the payload leaves EZPay.
 *
 * Replay protection:
 *   - Timestamp (in the signed payload) must be within +/- 5 minutes.
 *   - `stripeEventId` is an idempotency key — second call for the same
 *     event returns 200 `{applied: false}` without touching the user.
 *
 * Side effects on success:
 *   - Looks up the target `Application` and `AuthUser`.
 *   - `status === 'canceled'`: removes `grantsRoles` from `appRoles[<slug>]`
 *     and `grantsFeatures` from `features`.
 *   - Other statuses (active/trialing/past_due/incomplete): adds roles +
 *     features via set-union.
 *   - Writes a `SubscriptionEvent` row with `stripeEventId` (unique).
 *
 * @module apps/ezauth/api/src/routes/subscriptions/webhook
 */
import { createHmac, timingSafeEqual } from 'crypto'
import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getSubscriptionEventModel } from '../../models/subscription-event.js'
import { hashApiKey } from '../../utils/api-key.js'
import { logger } from '@ezstart/logger/server'

export const subscriptionWebhookRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(subscriptionWebhookRegistry, router)

/** Max age of a signed request (seconds). */
const REPLAY_WINDOW_SECONDS = 5 * 60

const subscriptionWebhookBodySchema = z.object({
  applicationId: z.string().min(1).openapi({ description: 'Target ezauth Application id' }),
  userId: z.string().min(1).openapi({ description: 'Target ezauth user id' }),
  subscriptionId: z.string().min(1).openapi({ description: 'Stripe subscription id' }),
  planId: z.string().min(1).openapi({ description: 'ezpay Plan id' }),
  stripeEventId: z
    .string()
    .min(1)
    .openapi({ description: 'Stripe event id (`evt_*`) — idempotency key' }),
  status: z
    .enum(['active', 'canceled', 'past_due', 'trialing', 'incomplete'])
    .openapi({ description: 'Subscription lifecycle status' }),
  grantsRoles: z.array(z.string()).optional(),
  grantsFeatures: z.array(z.string()).optional(),
  currentPeriodEnd: z.number().int().nonnegative().optional(),
  timestamp: z
    .string()
    .regex(/^\d+$/, 'timestamp must be an integer string (unix seconds)')
    .openapi({ description: 'Signed timestamp (unix seconds) — must match X-EZStart-Signature' }),
})

type SubscriptionWebhookBody = z.infer<typeof subscriptionWebhookBodySchema>

const subscriptionWebhookResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    applied: z.boolean(),
    alreadyApplied: z.boolean().optional(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
})

interface ParsedSignatureHeader {
  timestamp: string
  signature: string
}

/**
 * Parse `X-EZStart-Signature: t=<unix>,v1=<hex>` into its components.
 * Returns `null` if the header is absent or malformed.
 */
function parseSignatureHeader(header: string | undefined): ParsedSignatureHeader | null {
  if (!header) return null
  const parts = header.split(',').map(s => s.trim())
  let timestamp: string | null = null
  let signature: string | null = null
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq)
    const value = part.slice(eq + 1)
    if (key === 't') timestamp = value
    else if (key === 'v1') signature = value
  }
  if (!timestamp || !signature) return null
  return { timestamp, signature }
}

/** Constant-time comparison of two hex-encoded HMAC signatures. */
function signaturesMatch(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))
  } catch {
    return false
  }
}

const subscriptionWebhookController = async (req: Request, res: Response) => {
  try {
    // ---- 1. X-API-Key (admin scope) ------------------------------------
    const rawKey = req.headers['x-api-key']
    if (typeof rawKey !== 'string' || rawKey.length === 0) {
      logger.warn('[subscriptions/webhook] rejected — missing X-API-Key header')
      return sendError(res, 'API key required', 401, { code: 'UNAUTHORIZED' })
    }

    const hashedKey = hashApiKey(rawKey)
    const ApiKey = await getApiKeyModel()
    const apiKey = await ApiKey.findOne({ key: hashedKey }).lean()
    if (!apiKey) {
      logger.warn('[subscriptions/webhook] rejected — X-API-Key not found in DB', {
        apiKeyPrefix: rawKey.slice(0, 12),
      })
      return sendError(res, 'Invalid API key', 401, { code: 'UNAUTHORIZED' })
    }
    if (apiKey.status !== 'active') {
      logger.warn('[subscriptions/webhook] rejected — API key revoked', {
        apiKeyId: String(apiKey._id),
      })
      return sendError(res, 'API key has been revoked', 401, { code: 'UNAUTHORIZED' })
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      logger.warn('[subscriptions/webhook] rejected — API key expired', {
        apiKeyId: String(apiKey._id),
        expiresAt: apiKey.expiresAt,
      })
      return sendError(res, 'API key has expired', 401, { code: 'UNAUTHORIZED' })
    }
    if (apiKey.scope !== 'admin') {
      logger.warn('[subscriptions/webhook] rejected — API key lacks admin scope', {
        apiKeyId: String(apiKey._id),
        scope: apiKey.scope,
      })
      return sendError(res, 'Admin scope required', 403, { code: 'FORBIDDEN' })
    }

    // ---- 2. HMAC signature --------------------------------------------
    const secret = process.env.EZAUTH_WEBHOOK_SECRET
    if (!secret) {
      logger.error(
        '[subscriptions/webhook] EZAUTH_WEBHOOK_SECRET not configured — rejecting request'
      )
      return sendError(res, 'Webhook not configured', 503, { code: 'WEBHOOK_NOT_CONFIGURED' })
    }

    const parsedSig = parseSignatureHeader(req.headers['x-ezstart-signature'] as string | undefined)
    if (!parsedSig) {
      logger.warn('[subscriptions/webhook] rejected — missing/malformed signature header', {
        headerPresent: !!req.headers['x-ezstart-signature'],
      })
      return sendError(res, 'Missing or malformed signature header', 401, {
        code: 'INVALID_SIGNATURE',
      })
    }

    // ---- 3. Body schema ------------------------------------------------
    const parsed = subscriptionWebhookBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, parsed.error, 400, 'Invalid webhook body')
    }
    const body: SubscriptionWebhookBody = parsed.data

    // Signed payload must match `{timestamp}.{raw body}` as produced by the
    // sender. We re-serialize deterministically — the sender signs a JSON
    // blob that includes its own `timestamp` field identical to the
    // X-EZStart-Signature timestamp, so we sign `req.body` directly.
    const rawBody = JSON.stringify(req.body)
    const signedPayload = `${parsedSig.timestamp}.${rawBody}`
    const expectedSig = createHmac('sha256', secret).update(signedPayload).digest('hex')

    if (!signaturesMatch(expectedSig, parsedSig.signature)) {
      logger.warn('[subscriptions/webhook] rejected — signature mismatch', {
        timestamp: parsedSig.timestamp,
        rawBodyLen: rawBody.length,
        expectedPrefix: expectedSig.slice(0, 12),
        providedPrefix: parsedSig.signature.slice(0, 12),
      })
      return sendError(res, 'Invalid signature', 401, { code: 'INVALID_SIGNATURE' })
    }

    // The body's own `timestamp` must match the header `t=` to prevent
    // a signer from mixing two different timestamps.
    if (body.timestamp !== parsedSig.timestamp) {
      logger.warn('[subscriptions/webhook] rejected — body/header timestamp mismatch', {
        headerTimestamp: parsedSig.timestamp,
        bodyTimestamp: body.timestamp,
      })
      return sendError(res, 'Timestamp mismatch between header and body', 401, {
        code: 'INVALID_SIGNATURE',
      })
    }

    // ---- 4. Replay window ---------------------------------------------
    const signedAtSec = Number(parsedSig.timestamp)
    const nowSec = Math.floor(Date.now() / 1000)
    if (!Number.isFinite(signedAtSec) || Math.abs(nowSec - signedAtSec) > REPLAY_WINDOW_SECONDS) {
      logger.warn('[subscriptions/webhook] rejected — timestamp outside replay window', {
        signedAtSec,
        nowSec,
        deltaSec: nowSec - signedAtSec,
      })
      return sendError(res, 'Signature timestamp outside replay window', 401, {
        code: 'TIMESTAMP_EXPIRED',
      })
    }

    // ---- 5. Idempotency ------------------------------------------------
    const SubscriptionEvent = await getSubscriptionEventModel()
    const existing = await SubscriptionEvent.findOne({ stripeEventId: body.stripeEventId }).lean()
    if (existing) {
      return sendSuccess(res, { applied: false, alreadyApplied: true })
    }

    // ---- 6. Resolve Application + AuthUser ----------------------------
    const Application = await getApplicationModel()
    const application = await Application.findById(body.applicationId).lean()
    if (!application) {
      logger.warn('[subscriptions/webhook] rejected — Application not found', {
        applicationId: body.applicationId,
        stripeEventId: body.stripeEventId,
      })
      return sendError(res, 'Application not found', 404, { code: 'APPLICATION_NOT_FOUND' })
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(body.userId)
    if (!user) {
      logger.warn('[subscriptions/webhook] rejected — User not found', {
        userId: body.userId,
        stripeEventId: body.stripeEventId,
      })
      return sendError(res, 'User not found', 404, { code: 'USER_NOT_FOUND' })
    }

    // ---- 7. Apply grants ----------------------------------------------
    const slug = application.slug
    const rolesToApply = body.grantsRoles ?? []
    const featuresToApply = body.grantsFeatures ?? []

    if (body.status === 'canceled') {
      // Revoke — remove intersection of current roles/features with the set.
      const currentRoles = user.appRoles?.get(slug) ?? []
      const newRoles = currentRoles.filter(r => !rolesToApply.includes(r))
      if (newRoles.length > 0) {
        user.appRoles.set(slug, newRoles)
      } else {
        user.appRoles.delete(slug)
      }

      if (featuresToApply.length > 0) {
        user.features = (user.features ?? []).filter(f => !featuresToApply.includes(f))
      }
    } else {
      // Grant — union with the current values.
      if (rolesToApply.length > 0) {
        const currentRoles = user.appRoles?.get(slug) ?? []
        const merged = Array.from(new Set([...currentRoles, ...rolesToApply]))
        user.appRoles.set(slug, merged)
      }
      if (featuresToApply.length > 0) {
        const currentFeatures = user.features ?? []
        user.features = Array.from(new Set([...currentFeatures, ...featuresToApply]))
      }
    }

    await user.save()

    // ---- 8. Record SubscriptionEvent ---------------------------------
    try {
      await SubscriptionEvent.create({
        stripeEventId: body.stripeEventId,
        subscriptionId: body.subscriptionId,
        userId: body.userId,
        applicationId: body.applicationId,
        status: body.status,
        grantsRoles: rolesToApply.length > 0 ? rolesToApply : undefined,
        grantsFeatures: featuresToApply.length > 0 ? featuresToApply : undefined,
        appliedAt: new Date(),
      })
    } catch (err: unknown) {
      // A race where the same stripeEventId lands twice concurrently is
      // caught by the unique index — treat as idempotent success.
      const mongoErr = err as { code?: number } | undefined
      if (mongoErr?.code === 11000) {
        return sendSuccess(res, { applied: false, alreadyApplied: true })
      }
      throw err
    }

    logger.info('[subscriptions/webhook] applied', {
      stripeEventId: body.stripeEventId,
      subscriptionId: body.subscriptionId,
      userId: body.userId,
      applicationId: body.applicationId,
      slug,
      status: body.status,
    })

    return sendSuccess(res, { applied: true })
  } catch (error: unknown) {
    logger.error('[subscriptions/webhook] processing error', error)
    return sendError(res, 'Failed to process subscription webhook', 500, {
      code: 'INTERNAL_ERROR',
    })
  }
}

docRouter.post('/subscriptions/webhook', subscriptionWebhookController, {
  summary: 'Receive a cross-service subscription lifecycle event from EZPay',
  tags: ['Subscriptions'],
  bodySchema: subscriptionWebhookBodySchema,
  responseSchema: subscriptionWebhookResponseSchema,
  extraResponses: {
    400: { description: 'Invalid request body', schema: errorResponseSchema },
    401: { description: 'Invalid API key or signature', schema: errorResponseSchema },
    403: { description: 'API key lacks admin scope', schema: errorResponseSchema },
    404: { description: 'Application or user not found', schema: errorResponseSchema },
    503: { description: 'Webhook secret not configured', schema: errorResponseSchema },
  },
})

export default router
