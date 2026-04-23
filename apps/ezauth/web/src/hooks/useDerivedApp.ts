/**
 * Derive an app identifier from a `redirect_uri` when no explicit `?app=`
 * hint is provided and the publishable key is platform-scoped.
 *
 * Strategy — extract the leading subdomain label and match it against the
 * well-known @ezstart app names. Handles:
 * - Vercel staging: `ezpay-git-staging-ezstart.vercel.app` → `ezpay`
 * - Vercel preview: `ezbill.vercel.app` → `ezbill`
 * - Production: `ezpay.ezstart.xyz` → `ezpay`
 * - Localhost: skipped (no reliable signal)
 *
 * Returns `undefined` when the hostname does not start with a known app
 * slug so we never guess a wrong brand.
 */
export function deriveAppHintFromRedirectUri(redirectUri: string | undefined): string | undefined {
  if (!redirectUri) return undefined
  try {
    const url = new URL(redirectUri)
    const hostname = url.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined
    const firstLabel = hostname.split('.')[0]?.split('-')[0]
    if (!firstLabel) return undefined
    // Keep in sync with `@ezstart/config/urls` app registry.
    const KNOWN_APPS = new Set([
      'ezauth',
      'ezpay',
      'ezbill',
      'ezstart',
      'fengshui',
      'asc-tcd',
      'green-pulse',
      'gacha-analyzer',
    ])
    return KNOWN_APPS.has(firstLabel) ? firstLabel : undefined
  } catch {
    return undefined
  }
}
