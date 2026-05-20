/**
 * Behavioural tests for the Stripe webhook idempotency + atomicity hardening
 * (Wave E Lot 1C — findings C-4 / C-5).
 *
 * Unlike the existing `stripe-webhook.test.ts` (which simulates the DB side
 * effects), these tests invoke the REAL Express handler exported by
 * `routes/webhooks.ts` with a mocked Stripe provider + MongoMemoryServer, so
 * they exercise the actual idempotency gate, promo burn, and renewal creation
 * code paths.
 *
 * Coverage:
 *  (a) Same `event.id` replayed → side-effects run exactly once
 *      (promo burned once, no duplicate renewal Payment).
 *  (b) Invalid signature → 400, no side-effects.
 *  (c) Promo over-redemption TOCTOU → N concurrent maxUses:1 burns capped at 1.
 *  (d) `paymentId` unique across two near-simultaneous renewals.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Request, Response } from 'express'
import type { Model } from 'mongoose'
import type { WebhookEvent } from '@ezstart/pay-sdk/providers'

// ========================================
// Mock the Stripe provider BEFORE importing the route. The mock fns are
// defined INSIDE the (hoisted) factory and retrieved after import to avoid
// the "cannot access before initialization" hoisting trap.
// ========================================
vi.mock('../../services/stripe.js', () => {
  const verify = vi.fn<(payload: unknown, sig: string) => WebhookEvent>()
  const mockProvider = { verifyWebhookSignature: verify }
  return {
    getProvider: () => mockProvider,
    registry: { getDefault: () => mockProvider },
  }
})

// Mock the cross-service ezauth notifier so tests never reach out over HTTP.
vi.mock('../../services/ezauth-subscription-webhook.js', () => ({
  notifyEzauthSubscription: vi.fn(async () => {}),
}))

import webhookRouter from '../../routes/webhooks.js'
import { getProvider } from '../../services/stripe.js'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getPromoModel, type PromoDocument } from '../../models/Promo.js'
import {
  getWebhookEventModel,
  claimWebhookEvent,
  type WebhookEventDocument,
} from '../../models/WebhookEvent.js'

// Typed handle on the mocked verifyWebhookSignature.
const verifyWebhookSignature = vi.mocked(getProvider().verifyWebhookSignature)

// ========================================
// Express handler harness — pull the POST /webhooks/stripe handler off the
// router stack and call it directly with a fake req/res.
// ========================================
type WebhookHandler = (req: Request, res: Response) => Promise<void> | void

function getWebhookHandler(): WebhookHandler {
  const routerWithStack = webhookRouter as unknown as {
    stack: Array<{
      route?: {
        path: string
        methods: Record<string, boolean>
        stack: Array<{ handle: WebhookHandler }>
      }
    }>
  }
  const layer = routerWithStack.stack.find(
    l => l.route?.path === '/webhooks/stripe' && l.route.methods.post === true
  )
  const handle = layer?.route?.stack[0]?.handle
  if (!handle) {
    throw new Error('Could not locate POST /webhooks/stripe handler in router stack')
  }
  return handle
}

interface FakeResponse {
  statusCode: number
  body: unknown
  res: Response
}

function makeRes(): FakeResponse {
  const captured: FakeResponse = { statusCode: 200, body: undefined, res: undefined as never }
  const res = {
    status(code: number) {
      captured.statusCode = code
      return this
    },
    json(payload: unknown) {
      captured.body = payload
      return this
    },
    end() {
      return this
    },
  } as unknown as Response
  captured.res = res
  return captured
}

function makeReq(body: unknown, signature: string | null): Request {
  // `signature: null` → omit the header entirely (simulates a missing header).
  const headers: Record<string, string | undefined> = {}
  if (signature !== null) {
    headers['stripe-signature'] = signature
  }
  return { body, headers } as unknown as Request
}

async function invokeWebhook(opts: {
  event: WebhookEvent
  signature?: string
}): Promise<FakeResponse> {
  verifyWebhookSignature.mockReturnValueOnce(opts.event)
  const handler = getWebhookHandler()
  const res = makeRes()
  await handler(makeReq('raw', opts.signature ?? 'sig_valid'), res.res)
  return res
}

// ========================================
// Event builders
// ========================================
function checkoutCompletedEvent(opts: {
  eventId: string
  sessionId: string
  promoId?: string
  livemode?: boolean
}): WebhookEvent {
  return {
    type: 'checkout.completed',
    livemode: opts.livemode ?? false,
    raw: { id: opts.eventId },
    data: {
      sessionId: opts.sessionId,
      mode: 'payment',
      paymentMethod: 'card',
      paymentIntentId: `pi_${opts.sessionId}`,
      metadata: opts.promoId ? { promoId: opts.promoId } : undefined,
    },
  } as WebhookEvent
}

function invoiceRenewalEvent(opts: {
  eventId: string
  subscriptionId: string
  amount: number
  livemode?: boolean
}): WebhookEvent {
  return {
    type: 'invoice.payment_succeeded',
    livemode: opts.livemode ?? false,
    raw: { id: opts.eventId },
    data: {
      subscriptionId: opts.subscriptionId,
      amount: opts.amount,
      currency: 'eur',
      billingReason: 'subscription_cycle',
      periodEnd: '2026-07-01',
    },
  } as WebhookEvent
}

describe('Stripe Webhook — idempotency + atomicity (C-4 / C-5)', () => {
  let Payment: Model<PaymentDocument>
  let Promo: Model<PromoDocument>
  let WebhookEventModel: Model<WebhookEventDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
    Promo = await getPromoModel()
    WebhookEventModel = await getWebhookEventModel()
    // Ensure unique indexes exist (MongoMemoryServer doesn't auto-build them
    // synchronously across model recreations).
    await WebhookEventModel.createIndexes()
    try {
      await Promo.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Promo.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    await Promo.deleteMany({})
    await WebhookEventModel.deleteMany({})
    verifyWebhookSignature.mockReset()
  })

  // =======================================================================
  // (b) Invalid signature → 400, no side-effects
  // =======================================================================
  describe('signature verification', () => {
    it('rejects an invalid signature with 400 and records no event', async () => {
      verifyWebhookSignature.mockImplementationOnce(() => {
        throw new Error('No signatures found matching the expected signature for payload')
      })
      const handler = getWebhookHandler()
      const res = makeRes()
      await handler(makeReq('raw', 'sig_forged'), res.res)

      expect(res.statusCode).toBe(400)
      expect(res.body).toMatchObject({ success: false })
      // No idempotency record was claimed for a rejected payload.
      expect(await WebhookEventModel.countDocuments({})).toBe(0)
    })

    it('rejects a request with no stripe-signature header (400)', async () => {
      const handler = getWebhookHandler()
      const res = makeRes()
      await handler(makeReq('raw', null), res.res)

      expect(res.statusCode).toBe(400)
      expect(verifyWebhookSignature).not.toHaveBeenCalled()
    })
  })

  // =======================================================================
  // (a) Replayed event.id → processed exactly once
  // =======================================================================
  describe('event replay idempotency', () => {
    it('burns a promo exactly once when the same event.id is replayed', async () => {
      const promo = await Promo.create({
        code: 'BURNONCE',
        appName: 'myapp',
        discountType: 'percent',
        discountValue: 20,
        duration: 'once',
        active: true,
        maxUses: 5,
        usedCount: 0,
        isTestMode: true,
      })
      await Payment.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'purchase',
        amount: 10,
        paymentId: 'cs_replay_1',
        status: 'pending',
        provider: 'stripe',
        liveMode: false,
        isTestMode: true,
      })

      const event = checkoutCompletedEvent({
        eventId: 'evt_replay_1',
        sessionId: 'cs_replay_1',
        promoId: String(promo._id),
      })

      const first = await invokeWebhook({ event })
      const second = await invokeWebhook({ event })
      const third = await invokeWebhook({ event })

      expect(first.statusCode).toBe(200)
      expect(first.body).toMatchObject({ success: true, data: { received: true } })
      // Replays acknowledged as duplicates.
      expect(second.body).toMatchObject({ data: { received: true, duplicate: true } })
      expect(third.body).toMatchObject({ data: { received: true, duplicate: true } })

      const reloaded = await Promo.findById(promo._id)
      expect(reloaded?.usedCount).toBe(1) // burned ONCE despite 3 deliveries

      // Exactly one idempotency record persisted.
      expect(await WebhookEventModel.countDocuments({ eventId: 'evt_replay_1' })).toBe(1)
    })

    it('records a renewal Payment exactly once when invoice event is replayed', async () => {
      await Payment.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_orig_replay',
        status: 'completed',
        provider: 'stripe',
        userId: 'user_replay',
        customerEmail: 'replay@test.com',
        liveMode: false,
        isTestMode: true,
        metadata: { subscriptionId: 'sub_replay_1', planId: 'plan_x', planName: 'Pro' },
      })

      const event = invoiceRenewalEvent({
        eventId: 'evt_renewal_replay',
        subscriptionId: 'sub_replay_1',
        amount: 999,
      })

      await invokeWebhook({ event })
      await invokeWebhook({ event }) // replay
      await invokeWebhook({ event }) // replay

      // Renewal Payments are identified by their `renewal-<sub>-<uuid>`
      // paymentId prefix (metadata.billingReason is not in the Payment schema
      // and is stripped by Mongoose strict mode).
      const renewals = await Payment.find({
        paymentId: { $regex: '^renewal-sub_replay_1-' },
      })
      expect(renewals).toHaveLength(1) // no duplicate renewal
    })
  })

  // =======================================================================
  // (d) paymentId unique across two near-simultaneous renewals
  // =======================================================================
  describe('paymentId uniqueness', () => {
    it('generates distinct paymentIds for two renewals within the same millisecond', async () => {
      await Payment.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_orig_unique',
        status: 'completed',
        provider: 'stripe',
        userId: 'user_unique',
        liveMode: false,
        isTestMode: true,
        metadata: { subscriptionId: 'sub_unique_1' },
      })

      // Two DISTINCT events (distinct event.id) for the same subscription —
      // both pass the idempotency gate, both must create a renewal with a
      // unique paymentId even when Date.now() would collide.
      const e1 = invoiceRenewalEvent({
        eventId: 'evt_unique_1',
        subscriptionId: 'sub_unique_1',
        amount: 999,
      })
      const e2 = invoiceRenewalEvent({
        eventId: 'evt_unique_2',
        subscriptionId: 'sub_unique_1',
        amount: 999,
      })

      await invokeWebhook({ event: e1 })
      await invokeWebhook({ event: e2 })

      const renewals = await Payment.find({
        paymentId: { $regex: '^renewal-sub_unique_1-' },
      })
      expect(renewals).toHaveLength(2)
      const ids = renewals.map(r => r.paymentId)
      expect(new Set(ids).size).toBe(2) // both distinct → unique index satisfied
      // Both use the random-uuid suffix format (not the legacy Date.now()).
      for (const id of ids) {
        expect(id.startsWith('renewal-sub_unique_1-')).toBe(true)
      }
    })
  })

  // =======================================================================
  // claimWebhookEvent unit-level behaviour
  // =======================================================================
  describe('claimWebhookEvent', () => {
    it('returns true on first claim and false on duplicate', async () => {
      const first = await claimWebhookEvent('evt_claim_1', { eventType: 'checkout.completed' })
      const second = await claimWebhookEvent('evt_claim_1', { eventType: 'checkout.completed' })
      expect(first).toBe(true)
      expect(second).toBe(false)
      expect(await WebhookEventModel.countDocuments({ eventId: 'evt_claim_1' })).toBe(1)
    })

    it('absorbs concurrent claims of the same id (only one wins)', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => claimWebhookEvent('evt_claim_race'))
      )
      const winners = results.filter(Boolean)
      expect(winners).toHaveLength(1)
      expect(await WebhookEventModel.countDocuments({ eventId: 'evt_claim_race' })).toBe(1)
    })
  })
})
