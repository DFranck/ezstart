/**
 * POST /api/subscriptions/webhook — cross-service receiver for EZPay
 * subscription lifecycle events.
 *
 * Auth (two layers):
 *   1. `X-API-Key` — must be an active EZAuth API key with `scope: 'admin'`.
 *   2. `X-EZStart-Signature` — HMAC-SHA256 over `"{timestamp}.{body}"` using
 *      the **per-Application** `webhookSecret` stored on the target
 *      `Application` document (Stripe `whsec_*` pattern). Protects against
 *      key leak AND against downstream tampering once the payload leaves
 *      EZPay.
 *
 * Two-pass body parsing: the controller parses `req.body` first to extract
 * `applicationId`, then loads the Application's `webhookSecret` (with
 * `.select('+webhookSecret')`) and verifies the signature. This means a
 * caller MUST send a parseable JSON body that includes `applicationId`
 * before the signature can be checked — the schema parse short-circuits
 * with a 400 if not.
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
import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
  parseEzstartSignatureHeader,
  verifyEzstartSignature,
  EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS,
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

/**
 * Max age of a signed request (seconds). Re-exported from
 * `@ezstart/api-core/crypto` to keep this controller's behaviour pinned to
 * the canonical default — bumping the protocol-wide value updates this route
 * automatically.
 */
const REPLAY_WINDOW_SECONDS = EZSTART_SIGNATURE_REPLAY_WINDOW_SECONDS

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

// Note: signature parsing, HMAC verification, replay-window enforcement and
// constant-time compare all live in `@ezstart/api-core/crypto`. This file
// orchestrates the per-Application secret lookup that ezstart routes need on
// top of the protocol primitives.

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

    // ---- 2. Parse signature header -----------------------------------
    // We only PARSE here to extract the `t=` value for the body-timestamp
    // cross-check (step 4); the actual HMAC verification + replay-window
    // check is delegated to `verifyEzstartSignature` once we have loaded the
    // per-Application webhook secret in step 4.
    const parsedSig = parseEzstartSignatureHeader(
      req.headers['x-ezstart-signature'] as string | undefined
    )
    if (!parsedSig) {
      logger.warn('[subscriptions/webhook] rejected — missing/malformed signature header', {
        headerPresent: !!req.headers['x-ezstart-signature'],
      })
      return sendError(res, 'Missing or malformed signature header', 401, {
        code: 'INVALID_SIGNATURE',
      })
    }

    // ---- 3. Capture raw bytes + parse body -----------------------------
    // The route is registered in `rawBodyRoutes` (see `apps/ezauth/api/src/
    // index.ts`) so `req.body` is a `Buffer` containing the EXACT bytes the
    // sender HMAC'd. We parse the JSON ourselves here — a re-serialization
    // via `JSON.stringify(req.body)` would be a future engine upgrade time-
    // bomb (any spec drift in V8/Bun/Deno key ordering would silently break
    // every signature verify against ezpay). Storing the raw bytes also lets
    // us pass them directly to `verifyEzstartSignature` in step 4.
    //
    // For backwards compatibility (e.g. tests that mount the router under
    // an `express.json()` parser) we accept a parsed object and re-derive
    // the bytes via JSON.stringify — but the production path always reaches
    // here with a Buffer thanks to `rawBodyRoutes`.
    let rawBody: string
    let parsedJson: unknown
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8')
      try {
        parsedJson = JSON.parse(rawBody)
      } catch {
        return sendError(res, 'Invalid JSON body', 400, { code: 'INVALID_BODY' })
      }
    } else if (typeof req.body === 'string') {
      rawBody = req.body
      try {
        parsedJson = JSON.parse(rawBody)
      } catch {
        return sendError(res, 'Invalid JSON body', 400, { code: 'INVALID_BODY' })
      }
    } else {
      // Backwards-compat path (used by some tests that mount the router
      // behind `express.json()`). Production always uses raw body capture.
      parsedJson = req.body
      rawBody = JSON.stringify(req.body)
    }

    // Parse the body BEFORE the HMAC check — we need `applicationId` to
    // look up the per-Application webhook secret. A caller cannot escape
    // signature verification by sending unparseable garbage: the schema
    // parse fails fast with a 400 and never reaches the HMAC step.
    const parsed = subscriptionWebhookBodySchema.safeParse(parsedJson)
    if (!parsed.success) {
      return sendValidationError(res, parsed.error, 400, 'Invalid webhook body')
    }
    const body: SubscriptionWebhookBody = parsed.data

    // ---- 4. Resolve per-Application webhookSecret + verify HMAC -------
    // The Application's `webhookSecret` is a credential — `select: false`
    // on the schema means we MUST opt-in via `.select('+webhookSecret')`.
    const Application = await getApplicationModel()
    const application = await Application.findById(body.applicationId)
      .select('+webhookSecret')
      .lean()
    if (!application) {
      logger.warn('[subscriptions/webhook] rejected — Application not found', {
        applicationId: body.applicationId,
        stripeEventId: body.stripeEventId,
      })
      return sendError(res, 'Application not found', 404, { code: 'APPLICATION_NOT_FOUND' })
    }
    if (!application.webhookSecret) {
      // Should be impossible — `webhookSecret` is required + auto-defaulted
      // on creation. If we reach here, the document predates the field and
      // was not picked up by the backfill script.
      logger.error('[subscriptions/webhook] Application missing webhookSecret', {
        applicationId: body.applicationId,
        slug: application.slug,
      })
      return sendError(res, 'Webhook not configured for this Application', 503, {
        code: 'WEBHOOK_NOT_CONFIGURED',
      })
    }
    const secret = application.webhookSecret

    // Signed payload is `{timestamp}.{raw body}`. `rawBody` was captured
    // from the raw `Buffer` request body in step 3 — it is the exact byte
    // sequence the sender HMAC'd, so verification is engine-agnostic and
    // immune to any future JSON.stringify key-ordering drift.
    const verifyResult = verifyEzstartSignature({
      header: req.headers['x-ezstart-signature'] as string | undefined,
      secret,
      rawBody,
      replayWindowSec: REPLAY_WINDOW_SECONDS,
    })
    if (!verifyResult.ok) {
      if (verifyResult.reason === 'replay') {
        const signedAtSec = Number(parsedSig.timestamp)
        const nowSec = Math.floor(Date.now() / 1000)
        logger.warn('[subscriptions/webhook] rejected — timestamp outside replay window', {
          signedAtSec,
          nowSec,
          deltaSec: nowSec - signedAtSec,
        })
        return sendError(res, 'Signature timestamp outside replay window', 401, {
          code: 'TIMESTAMP_EXPIRED',
        })
      }
      // 'malformed' should not happen here — we already parsed the header in
      // step 2 — but treat it the same as a signature mismatch for safety.
      logger.warn('[subscriptions/webhook] rejected — signature mismatch', {
        reason: verifyResult.reason,
        timestamp: parsedSig.timestamp,
        rawBodyLen: rawBody.length,
        providedPrefix: parsedSig.signature.slice(0, 12),
        applicationId: body.applicationId,
      })
      return sendError(res, 'Invalid signature', 401, { code: 'INVALID_SIGNATURE' })
    }

    // The body's own `timestamp` must match the header `t=` to prevent a
    // signer from mixing two different timestamps (header timestamp inside
    // replay window, body timestamp 6 months old, etc.). This cross-check is
    // unique to this route because the body schema enshrines `timestamp` as
    // a first-class signed field.
    if (body.timestamp !== parsedSig.timestamp) {
      logger.warn('[subscriptions/webhook] rejected — body/header timestamp mismatch', {
        headerTimestamp: parsedSig.timestamp,
        bodyTimestamp: body.timestamp,
      })
      return sendError(res, 'Timestamp mismatch between header and body', 401, {
        code: 'INVALID_SIGNATURE',
      })
    }

    // ---- 6. Idempotency ------------------------------------------------
    const SubscriptionEvent = await getSubscriptionEventModel()
    const existing = await SubscriptionEvent.findOne({ stripeEventId: body.stripeEventId }).lean()
    if (existing) {
      return sendSuccess(res, { applied: false, alreadyApplied: true })
    }

    // ---- 7. Resolve AuthUser ------------------------------------------
    // Application was already loaded in step 4 to read the per-Application
    // webhook secret — reuse it here for the slug + role grant logic.
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(body.userId)
    if (!user) {
      logger.warn('[subscriptions/webhook] rejected — User not found', {
        userId: body.userId,
        stripeEventId: body.stripeEventId,
      })
      return sendError(res, 'User not found', 404, { code: 'USER_NOT_FOUND' })
    }

    // ---- 8. Apply grants ----------------------------------------------
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

    // ---- 9. Record SubscriptionEvent ---------------------------------
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
    503: {
      description: 'Application is missing its webhookSecret (run seed:webhook-secrets)',
      schema: errorResponseSchema,
    },
  },
})

export default router
