/**
 * Map app slug to human-readable display name for emails and UI context.
 * Falls back to "EZStart" when no app is provided, or returns the raw slug
 * capitalized if the app is unknown.
 */
const APP_DISPLAY_NAMES: Record<string, string> = {
  ezstart: 'EZStart',
  ezauth: 'EZAuth',
  ezbill: 'EZBill',
  ezpay: 'EZPay',
  fengshui: 'FengShui',
  'asc-tcd': 'ASC-TCD',
  'green-pulse': 'GreenPulse.AI',
  'gacha-analyzer': 'Gacha Analyzer',
}

export function getAppDisplayName(appName: string | undefined | null): string {
  if (!appName) return 'EZStart'
  const key = appName.toLowerCase()
  return APP_DISPLAY_NAMES[key] || appName
}

/**
 * Build a URL search-params string that preserves the `app` context and an
 * optional `redirect_uri`. `token` is always included first.
 */
export function buildAuthEmailParams(
  token: string,
  app?: string | null,
  redirectUri?: string | null
): string {
  const params = new URLSearchParams({ token })
  if (app) params.set('app', app)
  if (redirectUri) params.set('redirect_uri', redirectUri)
  return params.toString()
}
