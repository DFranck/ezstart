/**
 * PKCE (RFC 7636 / OAuth 2.1) — agnostic browser-safe helpers.
 *
 * Generates a high-entropy `code_verifier` and derives the S256
 * `code_challenge` = `BASE64URL(SHA256(verifier))`. Uses the Web Crypto API
 * (`crypto.getRandomValues` + `crypto.subtle.digest`) so the core stays
 * framework- AND Node-API-agnostic: it runs in any modern browser, Deno, Bun,
 * Cloudflare Workers, and Node ≥ 18 (which exposes `globalThis.crypto`).
 *
 * **S256 only.** The `plain` method offers no protection and is rejected by
 * the server contract (`PkceCodeChallengeMethodSchema = z.literal('S256')`).
 *
 * Zero `@ezstart/*` runtime dependency, zero React, zero Node-only API
 * (`Buffer`, `node:crypto`). See `standard.md` §1 (agnostic core).
 *
 * @module
 */

/**
 * The PKCE challenge method this SDK implements. `'S256'` per RFC 7636 §4.2 —
 * `'plain'` is intentionally unsupported.
 */
export const PKCE_METHOD_S256 = 'S256' as const

/**
 * `sessionStorage` key under which the OAuth redirect flow stashes the PKCE
 * `code_verifier` between the authorization redirect and the callback
 * exchange. Per-tab scope (sessionStorage) so the verifier can't leak across
 * tabs. Cleared immediately after the exchange.
 */
export const PKCE_VERIFIER_STORAGE_KEY = 'ezauth_pkce_verifier'

/**
 * A generated PKCE pair: the secret `codeVerifier` (kept by the client and
 * echoed on the /token exchange) and its derived public `codeChallenge`
 * (sent on the authorization request).
 */
export interface PkcePair {
  /** Secret high-entropy random string — 43 chars (32 bytes base64url). */
  codeVerifier: string
  /** `BASE64URL(SHA256(codeVerifier))` — 43 chars. */
  codeChallenge: string
  /** Always `'S256'`. */
  codeChallengeMethod: typeof PKCE_METHOD_S256
}

/**
 * Resolve the Web Crypto implementation. Throws a clear error when it is
 * unavailable (very old browsers, non-secure context) so the caller can fall
 * back to the legacy (no-PKCE) flow instead of crashing.
 *
 * @internal
 */
function getWebCrypto(): Crypto {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (!c || typeof c.getRandomValues !== 'function' || !c.subtle) {
    throw new Error('Web Crypto API unavailable — PKCE requires a secure context (https/localhost)')
  }
  return c
}

/**
 * Encode raw bytes as base64url (RFC 4648 §5) WITHOUT padding — the encoding
 * RFC 7636 mandates for the verifier and challenge. Avoids Node's `Buffer` so
 * the core stays agnostic.
 *
 * @internal
 */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  // `btoa` is available in browsers + Node ≥ 16 (globalThis.btoa). Convert the
  // standard base64 alphabet to URL-safe and strip padding.
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generate a cryptographically random `code_verifier` — 32 random bytes
 * encoded as base64url, yielding a 43-char URL-safe string (within the RFC
 * 7636 §4.1 43–128 window).
 *
 * @example
 * ```ts
 * const verifier = generateCodeVerifier()
 * // → 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' (example)
 * ```
 */
export function generateCodeVerifier(): string {
  const crypto = getWebCrypto()
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/**
 * Derive the S256 `code_challenge` for a given verifier:
 * `BASE64URL(SHA256(ASCII(code_verifier)))` (RFC 7636 §4.2).
 *
 * Async because `crypto.subtle.digest` returns a `Promise`.
 *
 * @example
 * ```ts
 * const verifier = generateCodeVerifier()
 * const challenge = await deriveCodeChallenge(verifier)
 * ```
 */
export async function deriveCodeChallenge(codeVerifier: string): Promise<string> {
  const crypto = getWebCrypto()
  // ASCII-encode the verifier (its charset is URL-safe ASCII, so UTF-8 ===
  // ASCII here) and SHA-256 it.
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Generate a fresh PKCE pair (verifier + S256 challenge).
 *
 * @example
 * ```ts
 * const { codeVerifier, codeChallenge, codeChallengeMethod } = await generatePkcePair()
 * // send codeChallenge + codeChallengeMethod on /login
 * // keep codeVerifier secret, echo it on /token
 * ```
 */
export async function generatePkcePair(): Promise<PkcePair> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await deriveCodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge, codeChallengeMethod: PKCE_METHOD_S256 }
}
