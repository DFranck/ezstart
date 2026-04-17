import { getWebUrl } from '@ezstart/config'

/**
 * Build an ezauth web URL for a given path and locale, with an optional `app`
 * query param so ezauth knows which app the user is coming from.
 *
 * @example
 * getEzauthUrl('/settings', 'en', 'green-pulse')
 * // → https://ezauth.ezstart.xyz/en/settings?app=green-pulse
 */
export function getEzauthUrl(path: string, locale: string = 'en', app?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = `${getWebUrl('ezauth')}/${locale}${normalizedPath}`
  const url = new URL(base)
  if (app) url.searchParams.set('app', app)
  return url.toString()
}
