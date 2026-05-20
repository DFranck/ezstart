/**
 * MED-1 (Wave D Lot 3A) — server-side password strength enforcement.
 *
 * Covers:
 *  - zxcvbn entropy gate (score < 3 → WeakPasswordError), BLOCKING + local.
 *  - HIBP k-anonymity breach check via `checkPwnedPassword` (hit / miss),
 *    `fetchExternal` mocked so no live network call is made.
 *  - `assertPasswordStrength` fail-open: a HIBP network error must NOT block
 *    account creation, while a genuine breach hit MUST block.
 *
 * `fetchExternal` from `@ezstart/api-sdk/core` is mocked at the module
 * boundary so the test never touches `https://api.pwnedpasswords.com`.
 * (The service imports it from `/core`, not the root — see the auditor-P1
 * import-bloat fix in Wave D Lot 3.5A.)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { zxcvbn as Zxcvbn } from '@zxcvbn-ts/core'
import crypto from 'crypto'

// Mock the external HTTP boundary. The factory returns a vi.fn we control
// per-test. Target the `/core` entry point — that's what the service imports.
const fetchExternalMock = vi.fn()
vi.mock('@ezstart/api-sdk/core', () => ({
  fetchExternal: (...args: unknown[]) => fetchExternalMock(...args),
}))

// Spy on the zxcvbn scorer WITHOUT changing its behaviour. The spy delegates
// to the real implementation (via `importActual`) so every other test sees
// genuine scores; it exists only so MED-2 can assert — deterministically, with
// zero dependency on wall-clock timing — that the service feeds zxcvbn a
// length-capped (<= 64 char) string. `vi.hoisted` lets the hoisted `vi.mock`
// factory and the test body share the same spy handle.
const { zxcvbnSpy } = vi.hoisted(() => ({ zxcvbnSpy: vi.fn() }))
vi.mock('@zxcvbn-ts/core', async () => {
  const actual = await vi.importActual<typeof import('@zxcvbn-ts/core')>('@zxcvbn-ts/core')
  zxcvbnSpy.mockImplementation((...args: Parameters<typeof Zxcvbn>) => actual.zxcvbn(...args))
  return { ...actual, zxcvbn: zxcvbnSpy }
})

// Import AFTER the mock so the service binds to the mocked `fetchExternal`.
const {
  assertPasswordStrength,
  checkPwnedPassword,
  WeakPasswordError,
  PwnedPasswordError,
  MIN_PASSWORD_SCORE,
} = await import('../../services/password-policy.service.js')

/** Build the HIBP range-API body that would report `password` as breached. */
function hibpBodyContaining(password: string, count = 42): string {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const suffix = sha1.slice(5)
  // Mix in unrelated suffixes so the matcher must actually find ours.
  return [
    '00000000000000000000000000000000000:3',
    `${suffix}:${count}`,
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1',
  ].join('\r\n')
}

describe('MED-1 — password-policy.service', () => {
  beforeEach(() => {
    fetchExternalMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('assertPasswordStrength — zxcvbn gate (NODE_ENV=test, HIBP skipped)', () => {
    it('rejects a low-entropy password with WeakPasswordError', async () => {
      // 'Password123!' scores 1 on zxcvbn (well below the floor of 3).
      await expect(assertPasswordStrength('Password123!')).rejects.toBeInstanceOf(WeakPasswordError)
    })

    it('rejects a trivially weak password (repeated chars)', async () => {
      await expect(assertPasswordStrength('aaaaaaaaaaaa')).rejects.toBeInstanceOf(WeakPasswordError)
    })

    it('rejects a password derived from the user identity (userInputs penalty)', async () => {
      // Control: 'zaphodbeeblebrox' scores 4 on its own (well above the floor).
      await expect(assertPasswordStrength('zaphodbeeblebrox')).resolves.toBeUndefined()
      // But when it IS the username/email, the userInputs penalty drops it to
      // 0 → rejected. Proves identity-derived passwords are caught.
      await expect(
        assertPasswordStrength('zaphodbeeblebrox', ['zaphodbeeblebrox@acme.io', 'zaphodbeeblebrox'])
      ).rejects.toBeInstanceOf(WeakPasswordError)
    })

    it('accepts a strong password (score >= 3) without touching the network', async () => {
      await expect(assertPasswordStrength('qZ7!vBn3kLp2xWm')).resolves.toBeUndefined()
      // HIBP is skipped under NODE_ENV=test → fetchExternal never called.
      expect(fetchExternalMock).not.toHaveBeenCalled()
    })

    it('exposes the documented minimum score', () => {
      expect(MIN_PASSWORD_SCORE).toBe(3)
    })
  })

  describe('checkPwnedPassword — HIBP k-anonymity', () => {
    it('sends ONLY the 5-char SHA-1 prefix (k-anonymity, no plaintext leak)', async () => {
      fetchExternalMock.mockResolvedValueOnce('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1')
      await checkPwnedPassword('some-password-value')

      const calledUrl = fetchExternalMock.mock.calls[0]?.[0] as string
      const sha1 = crypto
        .createHash('sha1')
        .update('some-password-value')
        .digest('hex')
        .toUpperCase()
      const prefix = sha1.slice(0, 5)
      const suffix = sha1.slice(5)

      // URL must end with the 5-char prefix and MUST NOT contain the full
      // hash or the plaintext password.
      expect(calledUrl.endsWith(`/${prefix}`)).toBe(true)
      expect(calledUrl).not.toContain(suffix)
      expect(calledUrl).not.toContain('some-password-value')
    })

    it('returns true when the suffix is present in the range response', async () => {
      const pwd = 'breached-password-example'
      fetchExternalMock.mockResolvedValueOnce(hibpBodyContaining(pwd))
      await expect(checkPwnedPassword(pwd)).resolves.toBe(true)
    })

    it('returns false when the suffix is absent from the range response', async () => {
      fetchExternalMock.mockResolvedValueOnce(
        '11111111111111111111111111111111111:9\n22222222222222222222222222222222222:3'
      )
      await expect(checkPwnedPassword('a-very-unique-passphrase-xyz')).resolves.toBe(false)
    })

    it('returns false when the body is not a string', async () => {
      fetchExternalMock.mockResolvedValueOnce(null)
      await expect(checkPwnedPassword('whatever')).resolves.toBe(false)
    })

    it('propagates network errors to the caller (fail-open is the caller policy)', async () => {
      fetchExternalMock.mockRejectedValueOnce(new Error('network down'))
      await expect(checkPwnedPassword('whatever')).rejects.toThrow('network down')
    })
  })

  describe('assertPasswordStrength — HIBP integration (NODE_ENV != test)', () => {
    beforeEach(() => {
      // Force the production code path so HIBP actually runs.
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('rejects a breached password with PwnedPasswordError', async () => {
      const pwd = 'qZ7!vBn3kLp2xWm' // strong on zxcvbn (score 4) so HIBP is the gate
      fetchExternalMock.mockResolvedValueOnce(hibpBodyContaining(pwd))
      await expect(assertPasswordStrength(pwd)).rejects.toBeInstanceOf(PwnedPasswordError)
    })

    it('FAIL-OPEN: a HIBP network error does NOT block a zxcvbn-strong password', async () => {
      fetchExternalMock.mockRejectedValueOnce(new Error('HIBP timeout'))
      // Strong password + HIBP failure → resolves (account creation proceeds).
      await expect(assertPasswordStrength('qZ7!vBn3kLp2xWm')).resolves.toBeUndefined()
    })

    it('FAIL-OPEN: a HIBP 5xx (ApiError) does NOT block', async () => {
      fetchExternalMock.mockRejectedValueOnce(new Error('External request failed with status 503'))
      await expect(assertPasswordStrength('qZ7!vBn3kLp2xWm')).resolves.toBeUndefined()
    })

    it('still rejects a weak password BEFORE reaching HIBP (zxcvbn is blocking)', async () => {
      await expect(assertPasswordStrength('Password123!')).rejects.toBeInstanceOf(WeakPasswordError)
      // zxcvbn fails first → HIBP never queried.
      expect(fetchExternalMock).not.toHaveBeenCalled()
    })

    it('accepts a strong, non-breached password (HIBP miss)', async () => {
      fetchExternalMock.mockResolvedValueOnce('00000000000000000000000000000000000:1')
      await expect(assertPasswordStrength('qZ7!vBn3kLp2xWm')).resolves.toBeUndefined()
      expect(fetchExternalMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('MED-2 — zxcvbn length cap (event-loop CPU bound)', () => {
    it('feeds zxcvbn a length-capped (<= 64 char) string for a 128-char password', async () => {
      // 128 distinct-ish chars — without the cap, zxcvbn would chew ~250ms of
      // synchronous CPU on this (its matcher graph is ~quadratic in length).
      // The fix slices the SCORED string to 64 chars before handing it to
      // zxcvbn. We prove that mechanism directly (deterministic, no wall-clock):
      // the scorer must be called with an input no longer than the cap.
      const longStrong = 'qZ7!vBn3kLp2xWm9' + 'tR4#dJ8sUe6yHc1' + 'oP0&aQ5wZx2mNb7'.repeat(7)
      const password = longStrong.slice(0, 128)
      expect(password.length).toBe(128)

      zxcvbnSpy.mockClear()
      await expect(assertPasswordStrength(password)).resolves.toBeUndefined()

      // zxcvbn was invoked exactly once, and the string it scored is the
      // 64-char prefix — never the full 128-char password.
      expect(zxcvbnSpy).toHaveBeenCalledTimes(1)
      const scoredInput = zxcvbnSpy.mock.calls[0]?.[0] as string
      expect(scoredInput.length).toBeLessThanOrEqual(64)
      expect(scoredInput).toBe(password.slice(0, 64))
    })

    it('only the first 64 chars are scored — a weak 64-char prefix is rejected even with a strong tail', async () => {
      // First 64 chars = a low-entropy keyboard walk / repeat (score 0-1).
      const weakPrefix = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' + '11111111111111111111111111111111'
      expect(weakPrefix.length).toBe(64)
      // Append a strong, high-entropy tail. If the FULL string were scored the
      // combined entropy would pass; because only the 64-char prefix is scored,
      // the weak prefix dominates → rejected. This proves the slice is applied.
      const strongTail = 'qZ7!vBn3kLp2xWm9tR4#dJ8sUe6yHc1oP0&aQ5wZx2mNb7'
      await expect(assertPasswordStrength(weakPrefix + strongTail)).rejects.toBeInstanceOf(
        WeakPasswordError
      )
    })

    it('a password whose first 64 chars are strong passes regardless of the tail', async () => {
      // First 64 chars carry ample entropy (score >= 3) — the verdict is the
      // same whether the tail is present or not. Confirms the cap never flips a
      // genuinely-strong password to weak.
      const strong64 = 'qZ7!vBn3kLp2xWm9tR4#dJ8sUe6yHc1oP0&aQ5wZx2mNb7Lk9$Rt3uYm6Xz0Wq8Hd'
      expect(strong64.length).toBeGreaterThanOrEqual(64)
      await expect(assertPasswordStrength(strong64 + 'zzzzzzzzzzzzzz')).resolves.toBeUndefined()
    })
  })

  describe('error classes', () => {
    it('WeakPasswordError carries a stable code + 422 status', () => {
      const err = new WeakPasswordError()
      expect(err.code).toBe('WEAK_PASSWORD')
      expect(err.statusCode).toBe(422)
      expect(err.name).toBe('WeakPasswordError')
    })

    it('PwnedPasswordError carries a stable code + 422 status', () => {
      const err = new PwnedPasswordError()
      expect(err.code).toBe('PWNED_PASSWORD')
      expect(err.statusCode).toBe(422)
      expect(err.name).toBe('PwnedPasswordError')
    })
  })
})
