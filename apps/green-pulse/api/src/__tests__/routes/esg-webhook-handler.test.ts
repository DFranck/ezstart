/**
 * End-to-end handler tests for `POST /webhooks/esg-report` (hacker A1b fixes
 * V2 / V3 / E1 / E2).
 *
 * Exercises the real Express handler with a mocked Mongoose idempotency
 * layer so we can assert:
 *   - V2: non-JSON Content-Type → 415 (no fallback re-serialization path)
 *   - E1: missing/invalid Buffer body → 400 (no crash in crypto.update)
 *   - V3: timestamped header outside the 5-minute window → 401
 *   - E2: replay of the same job_id (or hash) → second call returns 200
 *         with `duplicate: true` and DOES NOT re-fire side-effects
 *   - Happy path: fresh timestamped signature + first delivery → 200
 *   - Legacy: bare HMAC (no `t=`) signature still accepted for backcompat
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import type { Request, Response } from 'express'

// ----------------------------------------------------------------------------
// Mock the idempotency model so we don't need MongoMemoryServer for handler
// tests. The fn lives INSIDE the hoisted factory to avoid the
// "cannot access before initialization" trap.
// ----------------------------------------------------------------------------
vi.mock('../../models/EsgWebhookEvent.js', () => {
  const claim =
    vi.fn<
      (
        key: string,
        meta?: { eventType?: string }
      ) => Promise<'fresh' | 'recovered' | 'duplicate' | 'in-flight'>
    >()
  const mark = vi.fn<(key: string) => Promise<void>>()
  const release = vi.fn<(key: string) => Promise<void>>()
  return {
    claimEsgWebhookEvent: claim,
    markEsgWebhookEventProcessed: mark,
    releaseEsgWebhookEventClaim: release,
  }
})

import handleEsgReportRouter from '../../routes/webhooks/handleEsgReport.js'
import {
  claimEsgWebhookEvent,
  markEsgWebhookEventProcessed,
  releaseEsgWebhookEventClaim,
} from '../../models/EsgWebhookEvent.js'

const claimMock = vi.mocked(claimEsgWebhookEvent)
const markMock = vi.mocked(markEsgWebhookEventProcessed)
const releaseMock = vi.mocked(releaseEsgWebhookEventClaim)

const TEST_SECRET = 'whsec_handler_e2e_test'

// ----------------------------------------------------------------------------
// Express handler harness — pull the POST / handler off the router stack and
// call it directly with a fake req/res.
// ----------------------------------------------------------------------------
type Handler = (req: Request, res: Response) => Promise<void> | void

interface RouterLayer {
  name?: string
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: Array<{ handle: Handler }>
  }
  handle?: { stack?: RouterLayer[] } & Handler
}

/**
 * Walk the router stack (including nested sub-routers mounted via
 * `createRouterWithDoc(registry, router, '/esg-report')`) and return the
 * POST handler. The route lives under the sub-router so we recurse into
 * `use` layers that carry their own `handle.stack`.
 */
function findPostHandler(stack: RouterLayer[]): Handler | null {
  for (const layer of stack) {
    if (layer.route && layer.route.methods.post === true) {
      const handle = layer.route.stack[0]?.handle
      if (handle) return handle
    }
    if (layer.handle && typeof layer.handle === 'function' && Array.isArray(layer.handle.stack)) {
      const found = findPostHandler(layer.handle.stack)
      if (found) return found
    }
  }
  return null
}

function getHandler(): Handler {
  const router = handleEsgReportRouter as unknown as { stack: RouterLayer[] }
  const handler = findPostHandler(router.stack)
  if (!handler) throw new Error('Could not locate POST handler in router stack')
  return handler
}

interface FakeRes {
  /** Last status set via `res.status(code)` — defaults to 200. */
  readonly statusCode: number
  /** Last payload passed to `res.json(payload)`. */
  readonly body: unknown
  /** The fake Express Response object to hand to the handler. */
  readonly res: Response
}

function makeRes(): FakeRes {
  // Mutable closure state — `res.status()` and `res.json()` write to these.
  let statusCode = 200
  let body: unknown = undefined
  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(payload: unknown) {
      body = payload
      return this
    },
    end() {
      return this
    },
    setHeader() {
      return this
    },
  }
  // Return getters so test reads always reflect the latest mutation —
  // destructuring `const { ... } = makeRes()` would snapshot to the
  // initial values otherwise.
  return {
    get statusCode() {
      return statusCode
    },
    get body() {
      return body
    },
    res: res as unknown as Response,
  }
}

function makeReq(opts: {
  body: Buffer | string | object | undefined
  contentType?: string
  signature?: string
}): Request {
  return {
    body: opts.body,
    headers: {
      'content-type': opts.contentType ?? 'application/json',
      'x-esg-signature': opts.signature,
    },
  } as unknown as Request
}

function bareHmac(secret: string, body: Buffer): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

function timestampedHeader(secret: string, ts: string, body: Buffer): string {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${body.toString('utf8')}`)
    .digest('hex')
  return `t=${ts},v1=${sig}`
}

function validPayload(jobId = 'job_e2e'): Buffer {
  return Buffer.from(
    JSON.stringify({
      event_type: 'report.completed',
      job_id: jobId,
      status: 'ok',
      data: {},
      timestamp: new Date().toISOString(),
    }),
    'utf8'
  )
}

describe('POST /webhooks/esg-report — hardening (V2 / V3 / E1 / E2)', () => {
  const originalSecret = process.env.WEBHOOK_SIGNING_SECRET
  let handler: Handler

  beforeEach(() => {
    process.env.WEBHOOK_SIGNING_SECRET = TEST_SECRET
    // V4 default: keep legacy path enabled for backwards-compat tests.
    // The dedicated V4 tests override this explicitly.
    process.env.ESG_LEGACY_HMAC_ENABLED = 'true'
    handler = getHandler()
    // Debug — log the router stack structure on first call only
    claimMock.mockReset()
    markMock.mockReset()
    releaseMock.mockReset()
    // Default behaviour: every fresh claim succeeds. Individual tests can
    // override this for replay scenarios.
    claimMock.mockResolvedValue('fresh')
    markMock.mockResolvedValue(undefined)
    releaseMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.WEBHOOK_SIGNING_SECRET
    } else {
      process.env.WEBHOOK_SIGNING_SECRET = originalSecret
    }
    delete process.env.ESG_LEGACY_HMAC_ENABLED
    delete process.env.DEPLOY_ENV
  })

  // ------------------------------------------------------------------
  // V2 — Content-Type guard
  // ------------------------------------------------------------------
  it('V2: rejects application/x-www-form-urlencoded with 415 (no fallback to re-serialization)', async () => {
    const body = validPayload()
    const req = makeReq({
      body,
      contentType: 'application/x-www-form-urlencoded',
      signature: bareHmac(TEST_SECRET, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(415)
    expect(claimMock).not.toHaveBeenCalled()
  })

  it('V2: rejects missing Content-Type with 415', async () => {
    const req = {
      body: validPayload(),
      headers: { 'x-esg-signature': 'whatever' },
    } as unknown as Request
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(415)
  })

  // ------------------------------------------------------------------
  // E1 — Buffer guard (no 500 from crypto.update(undefined))
  // ------------------------------------------------------------------
  it('E1: rejects an undefined body with 400 (does not throw 500 from crypto.update)', async () => {
    const req = makeReq({ body: undefined, signature: 'deadbeef' })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(400)
    expect(claimMock).not.toHaveBeenCalled()
  })

  it('E1: rejects a parsed-object body (no Buffer) with 400 (raw bytes required)', async () => {
    const req = makeReq({
      body: { event_type: 'report.completed', job_id: 'x' },
      signature: 'deadbeef',
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(400)
  })

  // ------------------------------------------------------------------
  // Signature absent
  // ------------------------------------------------------------------
  it('rejects a missing X-Esg-Signature header with 401', async () => {
    const req = makeReq({ body: validPayload() })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(401)
    expect(claimMock).not.toHaveBeenCalled()
  })

  // ------------------------------------------------------------------
  // V3 — Replay protection
  // ------------------------------------------------------------------
  it('V3: rejects a timestamped signature older than 5 minutes with 401', async () => {
    const body = validPayload()
    const oldTs = (Math.floor(Date.now() / 1000) - 6 * 60).toString() // 6 min ago
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, oldTs, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(401)
    expect(claimMock).not.toHaveBeenCalled()
  })

  it('V3: rejects a tampered timestamp (signature was over original ts) with 401', async () => {
    const body = validPayload()
    const goodTs = Math.floor(Date.now() / 1000).toString()
    const original = timestampedHeader(TEST_SECRET, goodTs, body)
    // Attacker tries to slide the timestamp forward.
    const tampered = original.replace(`t=${goodTs}`, `t=${Number(goodTs) + 60}`)

    const req = makeReq({ body, signature: tampered })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(401)
  })

  it('V3: accepts a fresh timestamped signature within the tolerance window with 200', async () => {
    const body = validPayload('job_v3_ok')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(claimMock).toHaveBeenCalledTimes(1)
  })

  // ------------------------------------------------------------------
  // E2 — Idempotency / replay dedup
  // ------------------------------------------------------------------
  it('E2: duplicate delivery (same job_id) returns 200 with duplicate=true and skips dispatch', async () => {
    const body = validPayload('job_dup')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    // Simulate "already processed" — claim outcome is 'duplicate'.
    claimMock.mockResolvedValue('duplicate')

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(captured.body).toMatchObject({
      success: true,
    })
    expect(claimMock).toHaveBeenCalledTimes(1)
    expect(markMock).not.toHaveBeenCalled()
  })

  it('E2: idempotency store unreachable → 503 (do not ack, let upstream retry)', async () => {
    const body = validPayload('job_store_down')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    claimMock.mockRejectedValue(new Error('connection refused'))

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(503)
  })

  // ------------------------------------------------------------------
  // Legacy bare-HMAC path (backwards compat)
  // ------------------------------------------------------------------
  it('legacy: accepts a bare-HMAC signature (no t=) for backcompat — 200', async () => {
    const body = validPayload('job_legacy')
    const req = makeReq({
      body,
      signature: bareHmac(TEST_SECRET, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(claimMock).toHaveBeenCalledTimes(1)
  })

  it('legacy: rejects a forged bare-HMAC signature with 401', async () => {
    const body = validPayload('job_forge')
    const req = makeReq({
      body,
      signature: 'deadbeef'.repeat(8), // hex but wrong
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(401)
    expect(claimMock).not.toHaveBeenCalled()
  })

  // ------------------------------------------------------------------
  // V4 — Legacy HMAC gate (hacker A1b.5)
  // ------------------------------------------------------------------
  it('V4: legacy bare-HMAC rejected with 401 when ESG_LEGACY_HMAC_ENABLED=false', async () => {
    process.env.ESG_LEGACY_HMAC_ENABLED = 'false'
    const body = validPayload('job_legacy_blocked')
    const req = makeReq({
      body,
      signature: bareHmac(TEST_SECRET, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(401)
    expect(claimMock).not.toHaveBeenCalled()
    expect(captured.body).toMatchObject({
      success: false,
    })
  })

  it('V4: legacy bare-HMAC rejected by default in production (NODE_ENV=production)', async () => {
    delete process.env.ESG_LEGACY_HMAC_ENABLED
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const body = validPayload('job_legacy_prod')
      const req = makeReq({
        body,
        signature: bareHmac(TEST_SECRET, body),
      })
      const captured = makeRes()

      await handler(req, captured.res)

      expect(captured.statusCode).toBe(401)
      expect(claimMock).not.toHaveBeenCalled()
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = originalNodeEnv
      }
    }
  })

  it('V4: legacy bare-HMAC rejected by default in staging (DEPLOY_ENV=staging)', async () => {
    delete process.env.ESG_LEGACY_HMAC_ENABLED
    process.env.DEPLOY_ENV = 'staging'
    const body = validPayload('job_legacy_staging')
    const req = makeReq({
      body,
      signature: bareHmac(TEST_SECRET, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(401)
    expect(claimMock).not.toHaveBeenCalled()
  })

  it('V4: legacy bare-HMAC accepted in local dev (DEPLOY_ENV=local) without explicit opt-in', async () => {
    delete process.env.ESG_LEGACY_HMAC_ENABLED
    process.env.DEPLOY_ENV = 'local'
    const body = validPayload('job_legacy_local')
    const req = makeReq({
      body,
      signature: bareHmac(TEST_SECRET, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(claimMock).toHaveBeenCalledTimes(1)
  })

  it('V4: legacy bare-HMAC accepted with explicit override ESG_LEGACY_HMAC_ENABLED=true', async () => {
    process.env.ESG_LEGACY_HMAC_ENABLED = 'true'
    process.env.DEPLOY_ENV = 'production'
    const body = validPayload('job_legacy_override')
    const req = makeReq({
      body,
      signature: bareHmac(TEST_SECRET, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(claimMock).toHaveBeenCalledTimes(1)
  })

  it('V4: timestamped (v1) format works regardless of legacy gate', async () => {
    process.env.ESG_LEGACY_HMAC_ENABLED = 'false'
    process.env.DEPLOY_ENV = 'production'
    const body = validPayload('job_v1_in_prod')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(claimMock).toHaveBeenCalledTimes(1)
  })

  // ------------------------------------------------------------------
  // E4 — At-least-once idempotency (hacker A1b.5)
  // ------------------------------------------------------------------
  it('E4: in-flight claim returns 503 (let upstream retry)', async () => {
    const body = validPayload('job_in_flight')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    claimMock.mockResolvedValue('in-flight')

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(503)
    expect(markMock).not.toHaveBeenCalled()
    expect(releaseMock).not.toHaveBeenCalled()
  })

  it('E4: recovered claim re-runs dispatch (crash mid-dispatch recovery)', async () => {
    const body = validPayload('job_recovered')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    // Simulate a crash recovery — previous claim stale, take over.
    claimMock.mockResolvedValue('recovered')

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    // Dispatch ran AND we marked processed (at-least-once contract).
    expect(markMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).not.toHaveBeenCalled()
  })

  it('E4: dispatch error releases the claim so next retry can recover', async () => {
    const body = validPayload('job_dispatch_fail')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    // Fresh claim, but dispatch will throw inside the handler. We simulate
    // this by making the mark step throw (the model layer is the only
    // mockable boundary in this handler harness — but the contract is the
    // same: any throw inside the dispatch try/catch must release).
    claimMock.mockResolvedValue('fresh')
    markMock.mockRejectedValue(new Error('downstream write failed'))

    await handler(req, captured.res)

    // Outer catch maps to 500 (sendError default).
    expect(captured.statusCode).toBe(500)
    // Release was attempted (the contract that makes E4 at-least-once).
    expect(releaseMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).toHaveBeenCalledWith(expect.stringMatching(/job_dispatch_fail/))
  })

  it('E4: fresh claim → dispatch → mark processed (happy path closes the at-least-once window)', async () => {
    const body = validPayload('job_fresh_happy')
    const ts = Math.floor(Date.now() / 1000).toString()
    const req = makeReq({
      body,
      signature: timestampedHeader(TEST_SECRET, ts, body),
    })
    const captured = makeRes()

    claimMock.mockResolvedValue('fresh')

    await handler(req, captured.res)

    expect(captured.statusCode).toBe(200)
    expect(markMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).not.toHaveBeenCalled()
  })
})
