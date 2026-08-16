/**
 * Wave E MED-2 — webhook test/live partition.
 *
 * Proves:
 *  (d) a `livemode: false` (test) event scopes its writes to `isTestMode: true`
 *      and claims the ledger under the test partition; a `livemode: true` (live)
 *      event writes `isTestMode: false`.
 *  - dedup is MODE-SCOPED: the same `event.id` delivered once as test and once
 *    as live is processed once PER MODE (the compound `{eventId,isTestMode}`
 *    index keeps the two partitions independent).
 *  - cross-mode isolation (security): an event whose VERIFIED mode is `test`
 *    can never mutate a LIVE payment row, and its dedup claim is recorded under
 *    the verified (test) partition — not the payload's self-declared mode.
 *
 * Invokes the REAL Express handler with a mocked `verifyStripeWebhook` (the
 * mode-aware verifier) + MongoMemoryServer.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Request, Response } from 'express'
import type { Model } from 'mongoose'
import type { WebhookEvent } from '@ezstart/pay-sdk/providers'

vi.mock('../../services/stripe.js', () => ({
  verifyStripeWebhook:
    vi.fn<(payload: unknown, sig: string) => { event: WebhookEvent; mode: 'test' | 'live' }>(),
}))

vi.mock('../../services/ezauth-subscription-webhook.js', () => ({
  notifyEzauthSubscription: vi.fn(async () => {}),
}))

import webhookRouter from '../../routes/webhooks.js'
import { verifyStripeWebhook } from '../../services/stripe.js'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import {
  getWebhookEventModel,
  ensureWebhookEventIndexes,
  type WebhookEventDocument,
} from '../../models/WebhookEvent.js'

const verify = vi.mocked(verifyStripeWebhook)

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
  if (!handle) throw new Error('Could not locate POST /webhooks/stripe handler')
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

function makeReq(): Request {
  return { body: 'raw', headers: { 'stripe-signature': 'sig_valid' } } as unknown as Request
}

async function invoke(event: WebhookEvent): Promise<FakeResponse> {
  // verifyStripeWebhook now returns { event, mode }; the handler keys off the
  // verified `mode`. Derive it from livemode so the existing scenarios keep
  // their semantics (livemode:true → live, livemode:false → test).
  const mode = event.livemode ? 'live' : 'test'
  verify.mockReturnValueOnce({ event, mode })
  const res = makeRes()
  await getWebhookHandler()(makeReq(), res.res)
  return res
}

function checkoutEvent(opts: {
  eventId: string
  sessionId: string
  livemode: boolean
}): WebhookEvent {
  return {
    type: 'checkout.completed',
    livemode: opts.livemode,
    raw: { id: opts.eventId },
    data: {
      sessionId: opts.sessionId,
      mode: 'payment',
      paymentMethod: 'card',
      paymentIntentId: `pi_${opts.sessionId}`,
    },
  } as WebhookEvent
}

describe('Stripe Webhook — test/live partition (Wave E MED-2)', () => {
  let Payment: Model<PaymentDocument>
  let WebhookEventModel: Model<WebhookEventDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
    WebhookEventModel = await getWebhookEventModel()
    // Build the compound unique {eventId,isTestMode} index (and drop legacy).
    await ensureWebhookEventIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    await WebhookEventModel.deleteMany({})
    verify.mockReset()
  })

  it('(d) a livemode:false event writes isTestMode:true on the matching payment', async () => {
    await Payment.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'purchase',
      amount: 10,
      paymentId: 'cs_test_evt',
      status: 'pending',
      provider: 'stripe',
      liveMode: false,
      isTestMode: true,
    })

    const res = await invoke(
      checkoutEvent({ eventId: 'evt_test_1', sessionId: 'cs_test_evt', livemode: false })
    )
    expect(res.statusCode).toBe(200)

    const updated = await Payment.findOne({ paymentId: 'cs_test_evt' })
    expect(updated?.status).toBe('completed')
    expect(updated?.isTestMode).toBe(true)
    expect(updated?.liveMode).toBe(false)

    // Ledger claim recorded under the test partition.
    const ledger = await WebhookEventModel.findOne({ eventId: 'evt_test_1' })
    expect(ledger?.isTestMode).toBe(true)
  })

  it('a livemode:true event writes isTestMode:false on the matching payment', async () => {
    await Payment.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'purchase',
      amount: 10,
      paymentId: 'cs_live_evt',
      status: 'pending',
      provider: 'stripe',
      liveMode: true,
      isTestMode: false,
    })

    const res = await invoke(
      checkoutEvent({ eventId: 'evt_live_1', sessionId: 'cs_live_evt', livemode: true })
    )
    expect(res.statusCode).toBe(200)

    const updated = await Payment.findOne({ paymentId: 'cs_live_evt' })
    expect(updated?.status).toBe('completed')
    expect(updated?.isTestMode).toBe(false)

    const ledger = await WebhookEventModel.findOne({ eventId: 'evt_live_1' })
    expect(ledger?.isTestMode).toBe(false)
  })

  it('dedup is mode-scoped: the same event.id is processed once per mode', async () => {
    // A live + a test payment that share nothing but the webhook event id.
    await Payment.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'purchase',
      amount: 10,
      paymentId: 'cs_shared_test',
      status: 'pending',
      provider: 'stripe',
      liveMode: false,
      isTestMode: true,
    })
    await Payment.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'purchase',
      amount: 10,
      paymentId: 'cs_shared_live',
      status: 'pending',
      provider: 'stripe',
      liveMode: true,
      isTestMode: false,
    })

    // Same event.id, different modes → both must be claimed + processed.
    const testRes = await invoke(
      checkoutEvent({ eventId: 'evt_shared', sessionId: 'cs_shared_test', livemode: false })
    )
    const liveRes = await invoke(
      checkoutEvent({ eventId: 'evt_shared', sessionId: 'cs_shared_live', livemode: true })
    )

    expect(testRes.statusCode).toBe(200)
    expect(testRes.body).toMatchObject({ data: { received: true } })
    expect(liveRes.statusCode).toBe(200)
    // The live delivery is NOT treated as a duplicate of the test one.
    expect(liveRes.body).not.toMatchObject({ data: { duplicate: true } })

    const testPayment = await Payment.findOne({ paymentId: 'cs_shared_test' })
    const livePayment = await Payment.findOne({ paymentId: 'cs_shared_live' })
    expect(testPayment?.status).toBe('completed')
    expect(livePayment?.status).toBe('completed')

    // Two ledger rows — one per mode — for the same event id.
    const ledgerRows = await WebhookEventModel.find({ eventId: 'evt_shared' })
    expect(ledgerRows).toHaveLength(2)
    expect(new Set(ledgerRows.map(r => r.isTestMode))).toEqual(new Set([true, false]))
  })

  it('a redelivery of the SAME mode event is a no-op duplicate', async () => {
    await Payment.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'purchase',
      amount: 10,
      paymentId: 'cs_dup',
      status: 'pending',
      provider: 'stripe',
      liveMode: false,
      isTestMode: true,
    })

    const first = await invoke(
      checkoutEvent({ eventId: 'evt_dup', sessionId: 'cs_dup', livemode: false })
    )
    const second = await invoke(
      checkoutEvent({ eventId: 'evt_dup', sessionId: 'cs_dup', livemode: false })
    )

    expect(first.body).toMatchObject({ data: { received: true } })
    expect(second.body).toMatchObject({ data: { received: true, duplicate: true } })

    const ledgerRows = await WebhookEventModel.find({ eventId: 'evt_dup' })
    expect(ledgerRows).toHaveLength(1)
  })
})

describe('Stripe Webhook — cross-mode isolation (test-verified event vs LIVE data)', () => {
  let Payment: Model<PaymentDocument>
  let WebhookEventModel: Model<WebhookEventDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
    WebhookEventModel = await getWebhookEventModel()
    await ensureWebhookEventIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    await WebhookEventModel.deleteMany({})
    verify.mockReset()
  })

  it('a test-verified event must NOT complete a LIVE payment row', async () => {
    // A genuine LIVE pending payment (created by a real ez_pk_live_ checkout).
    await Payment.create({
      projectId: 'victimapp',
      projectName: 'Victim',
      type: 'purchase',
      amount: 999,
      currency: 'eur',
      provider: 'stripe',
      paymentId: 'cs_live_victim_1',
      status: 'pending',
      liveMode: true,
      isTestMode: false,
    })

    // The verifier returns the verified mode (`test`) — the only trustworthy
    // signal. A delivery signed with the TEST secret cannot be trusted to
    // touch live data, regardless of the payload's `data.sessionId` targeting a
    // live row.
    verify.mockReturnValueOnce({
      mode: 'test',
      event: {
        type: 'checkout.completed',
        livemode: false,
        raw: { id: 'evt_attacker_1' },
        data: { sessionId: 'cs_live_victim_1', mode: 'payment', paymentMethod: 'card' },
      } as WebhookEvent,
    })

    const res = makeRes()
    await getWebhookHandler()(makeReq(), res.res)
    expect(res.statusCode).toBe(200)

    // Read the live row WITHOUT scope (skip the plugin) to observe the truth.
    const victim = await Payment.findOne({ paymentId: 'cs_live_victim_1' })
      .setOptions({ skipTestModeScope: true })
      .lean()

    // The handler keys off the verified `mode='test'`, so it writes
    // isTestMode:true and never matches this live row → the live payment STAYS
    // `pending`.
    expect(
      victim?.status,
      'a test-verified event must NOT be able to complete a LIVE payment'
    ).toBe('pending')
  })

  it('records the dedup claim against the VERIFIED (test) partition, not the payload', async () => {
    verify.mockReturnValueOnce({
      mode: 'test',
      event: {
        type: 'checkout.completed',
        livemode: false,
        raw: { id: 'evt_attacker_dedup' },
        data: { sessionId: 'cs_none', mode: 'payment' },
      } as WebhookEvent,
    })

    const res = makeRes()
    await getWebhookHandler()(makeReq(), res.res)

    const claim = await WebhookEventModel.findOne({ eventId: 'evt_attacker_dedup' })
      .setOptions({ skipTestModeScope: true })
      .lean()

    // The claim's isTestMode follows the VERIFIED mode (test), not the payload.
    expect(claim?.isTestMode, 'dedup partition must follow the verifying secret').toBe(true)
  })
})
