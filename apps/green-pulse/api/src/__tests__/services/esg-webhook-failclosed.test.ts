/**
 * Fail-closed guard for the ESG webhook HMAC verifier (hacker A1b — V1).
 *
 * Reproduces the bypass where an unset `WEBHOOK_SIGNING_SECRET` would fall
 * through to `crypto.createHmac('sha256', '')`, letting any attacker compute
 * the matching empty-secret HMAC and forge any payload. The fix is
 * fail-closed: both verifiers return `false` (or `{ ok: false }`) immediately
 * when the secret is unset, and the boot-time `assertWebhookSecretConfigured`
 * throws in deployed environments so the API refuses to start.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { esgService, assertWebhookSecretConfigured } from '../../services/esg.service.js'

function sign(secret: string, payload: Buffer | string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

describe('esgService — fail-closed on empty WEBHOOK_SIGNING_SECRET (V1)', () => {
  const originalSecret = process.env.WEBHOOK_SIGNING_SECRET
  const originalNodeEnv = process.env.NODE_ENV
  const originalDeployEnv = process.env.DEPLOY_ENV

  beforeEach(() => {
    delete process.env.WEBHOOK_SIGNING_SECRET
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.WEBHOOK_SIGNING_SECRET
    } else {
      process.env.WEBHOOK_SIGNING_SECRET = originalSecret
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv
    }
  })

  it('verifyWebhookSignature returns false when the secret is unset (not a fall-through to empty-string HMAC)', () => {
    const wireBytes = Buffer.from('{"event_type":"report.completed"}', 'utf8')
    // The attacker computes the HMAC with an empty secret — this is the
    // bypass: if the verifier ALSO uses '' it would accept this.
    const attackerSig = sign('', wireBytes)

    expect(esgService.verifyWebhookSignature(wireBytes, attackerSig)).toBe(false)
  })

  it('verifyTimestampedSignature returns { ok: false, reason: "signature" } when the secret is unset', () => {
    const wireBytes = Buffer.from('{"k":"v"}', 'utf8')
    const ts = Math.floor(Date.now() / 1000).toString()
    // Attacker signs with the empty secret (the bypass that V1 closes).
    const attackerSig = sign('', `${ts}.${wireBytes.toString('utf8')}`)
    const header = `t=${ts},v1=${attackerSig}`

    const result = esgService.verifyTimestampedSignature(wireBytes, header)
    expect(result.ok).toBe(false)
  })

  it('assertWebhookSecretConfigured throws in production when secret is unset', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.DEPLOY_ENV

    expect(() => assertWebhookSecretConfigured()).toThrow(/WEBHOOK_SIGNING_SECRET is required/)
  })

  it('assertWebhookSecretConfigured throws when DEPLOY_ENV=staging and secret is unset', () => {
    delete process.env.NODE_ENV
    process.env.DEPLOY_ENV = 'staging'

    expect(() => assertWebhookSecretConfigured()).toThrow(/WEBHOOK_SIGNING_SECRET is required/)
  })

  it('assertWebhookSecretConfigured warns (does not throw) in local dev when secret is unset', () => {
    delete process.env.NODE_ENV
    process.env.DEPLOY_ENV = 'local'

    expect(() => assertWebhookSecretConfigured()).not.toThrow()
  })

  it('assertWebhookSecretConfigured succeeds in production when secret is configured', () => {
    process.env.NODE_ENV = 'production'
    process.env.WEBHOOK_SIGNING_SECRET = 'whsec_prod_value'

    expect(() => assertWebhookSecretConfigured()).not.toThrow()
  })
})
