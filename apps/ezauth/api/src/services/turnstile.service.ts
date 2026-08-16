/**
 * Cloudflare Turnstile token verification service.
 *
 * Wraps Cloudflare's `/siteverify` endpoint with a no-op fast-path for
 * environments that haven't configured `TURNSTILE_SECRET_KEY` yet —
 * letting us ship the captcha integration today and enable it later by
 * populating the env var without touching application code.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

import { logger } from '@ezstart/logger/server'

/** Cloudflare Turnstile public verification endpoint. */
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Result returned by {@link verifyTurnstileToken}. */
export interface TurnstileVerifyResult {
  /** Whether the captcha verification passed. */
  success: boolean
  /** Cloudflare error codes (only set when `success === false`). */
  errorCodes?: string[]
}

/**
 * Verify a Cloudflare Turnstile token via the upstream `/siteverify` API.
 *
 * Behaviour matrix:
 * - `TURNSTILE_SECRET_KEY` unset → returns `{ success: true }` (no-op,
 *   captcha disabled).
 * - `token` empty/missing → returns `{ success: false, errorCodes: ['missing-token'] }`.
 * - Network/parse error → returns `{ success: false, errorCodes: ['network-error'] }`
 *   so the caller can decide whether to fail-closed or degrade gracefully.
 * - Cloudflare verification result is forwarded unchanged.
 *
 * @param token - The token returned by the client-side `<TurnstileWidget>`.
 * @param remoteIp - Optional best-effort source IP from the request.
 *                   Cloudflare uses it as one of the anti-replay signals.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env['TURNSTILE_SECRET_KEY']
  // No-op when the secret isn't configured — lets the SDK ship today
  // and consumers enable Turnstile later by setting the env var.
  if (!secretKey) {
    return { success: true }
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-token'] }
  }

  try {
    const formData = new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    })
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
    })
    const json = (await res.json()) as {
      success: boolean
      'error-codes'?: string[]
    }
    return {
      success: json.success,
      ...(json['error-codes'] ? { errorCodes: json['error-codes'] } : {}),
    }
  } catch (err) {
    logger.warn({ err }, '[turnstile] verify failed (network/parse)')
    return { success: false, errorCodes: ['network-error'] }
  }
}
