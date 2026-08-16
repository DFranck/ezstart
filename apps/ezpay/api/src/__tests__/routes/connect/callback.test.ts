/**
 * Tests for GET /api/connect/callback — VULN-1 regression guard.
 *
 * Before the signed-state fix this endpoint accepted any `account_id` and
 * would burn Stripe quota + leak `stripeAccountId → applicationId` mappings
 * via the 302 `Location` header. The test suite asserts that every path
 * missing a valid signed state fails closed with 400, and that the Stripe
 * API is never reached in those cases.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../../models/ConnectedAccount.js'
import type { Model } from 'mongoose'

// Provide JWT_SECRET BEFORE importing anything that resolves it at module
// import time (verifyConnectState calls getJwtSecret inside the route).
const TEST_SECRET = 'test-jwt-secret-for-callback-12345'
const originalSecret = process.env.JWT_SECRET
process.env.JWT_SECRET = TEST_SECRET

// Mock the Stripe singleton used by callback.ts. We track calls on
// `retrieveMock` so tests can assert Stripe was (or wasn't) hit.
const retrieveMock = vi.fn()
vi.mock('../../../services/stripe-connect.js', () => ({
  getStripeInstanceForMode: () => ({
    accounts: {
      retrieve: retrieveMock,
    },
  }),
}))

// Dynamic imports AFTER mocks / env are in place.
const callbackMod = await import('../../../routes/connect/callback.js')
const stateMod = await import('../../../utils/connect-state.js')

function createApp(): Express {
  const app = express()
  app.use('/api', callbackMod.router)
  return app
}

interface CallbackResponse {
  status: number
  location?: string
  body: string
}

async function getCallback(
  app: Express,
  query: Record<string, string | undefined>
): Promise<CallbackResponse> {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${v as string}`)
    .join('&')
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = addr.port
      fetch(`http://127.0.0.1:${port}/api/connect/callback${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        redirect: 'manual',
      })
        .then(async r => {
          const text = await r.text()
          server.close()
          resolve({
            status: r.status,
            location: r.headers.get('location') ?? undefined,
            body: text,
          })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('GET /api/connect/callback — signed state (VULN-1 regression)', () => {
  let app: Express
  let ConnectedAccount: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    ConnectedAccount = await getConnectedAccountModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = originalSecret
    }
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
    retrieveMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when state is missing (and never calls Stripe)', async () => {
    const res = await getCallback(app, { account_id: 'acct_evil' })
    expect(res.status).toBe(400)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('returns 400 when state signature is invalid', async () => {
    const res = await getCallback(app, {
      account_id: 'acct_evil',
      state: 'Zm9yZ2VkLXBheWxvYWQ.forged-signature',
    })
    expect(res.status).toBe(400)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('returns 400 when state is expired', async () => {
    // Craft a state that is valid-signed but immediately stale. We cannot
    // time-travel here, so we patch Date.now DURING generation to a moment
    // > 1h in the past, then restore it before calling the endpoint.
    const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() - 2 * 60 * 60 * 1000)
    const expiredState = stateMod.generateConnectState({ applicationId: 'app-1' })
    spy.mockRestore()

    const res = await getCallback(app, {
      account_id: 'acct_x',
      state: expiredState,
    })
    expect(res.status).toBe(400)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('returns 400 when state points to a non-existent application (fail-closed)', async () => {
    // No ConnectedAccount row for this applicationId. Stripe is reachable
    // and returns a valid account object, but the DB lookup fails — we must
    // NOT redirect into the app, we must 400.
    retrieveMock.mockResolvedValueOnce({
      id: 'acct_ghost',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })
    const state = stateMod.generateConnectState({ applicationId: 'app-does-not-exist' })

    const res = await getCallback(app, {
      account_id: 'acct_ghost',
      state,
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 + logs warn when state applicationId diverges from DB row', async () => {
    await ConnectedAccount.create({
      applicationId: 'app-real',
      userId: 'u-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_shared',
      email: 'x@example.com',
      businessName: 'Shared',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    retrieveMock.mockResolvedValueOnce({
      id: 'acct_shared',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })
    // Attacker forges a state for a DIFFERENT applicationId they control,
    // but points `account_id` at someone else's acct_shared. The combined
    // (applicationId, stripeAccountId) lookup must miss, and we must NOT
    // let the attacker update the victim's record.
    const state = stateMod.generateConnectState({ applicationId: 'app-attacker' })

    const res = await getCallback(app, {
      account_id: 'acct_shared',
      state,
    })
    expect(res.status).toBe(400)
    const victim = await ConnectedAccount.findOne({ applicationId: 'app-real' }).lean()
    expect(victim?.status).toBe('pending') // untouched
  })

  it('302-redirects when state is valid and DB row matches', async () => {
    await ConnectedAccount.create({
      applicationId: 'app-ok',
      userId: 'u-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_ok',
      email: 'ok@example.com',
      businessName: 'OK',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    retrieveMock.mockResolvedValueOnce({
      id: 'acct_ok',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })
    const state = stateMod.generateConnectState({ applicationId: 'app-ok' })

    const res = await getCallback(app, {
      account_id: 'acct_ok',
      state,
      locale: 'fr',
    })
    expect(res.status).toBe(302)
    expect(res.location).toBeDefined()
    expect(res.location).toMatch(/\/fr\/developer\/applications\/app-ok\/connect\?status=complete$/)

    const updated = await ConnectedAccount.findOne({ applicationId: 'app-ok' }).lean()
    expect(updated?.status).toBe('active')
    expect(updated?.chargesEnabled).toBe(true)
    expect(updated?.payoutsEnabled).toBe(true)
  })
})
