/**
 * Build an ezauth web URL for a given path and locale, with an optional `app`
 * query param so ezauth knows which app the user is coming from.
 *
 * Agnostic — the caller supplies the fully qualified `ezauthWebUrl` (e.g.
 * `'https://ezauth.ezstart.xyz'`). Monorepo consumers resolve it via
 * `getWebUrl('ezauth')` from `@ezstart/config`; external consumers pass their
 * own URL.
 *
 * @breaking Signature changed from `(path, locale?, app?)` to
 * `(ezauthWebUrl, path, locale?, app?)` to remove the hard dependency on
 * `@ezstart/config`. Update call sites to pass the URL explicitly.
 *
 * @example
 * getEzauthUrl('https://ezauth.ezstart.xyz', '/settings', 'en', 'green-pulse')
 * // → https://ezauth.ezstart.xyz/en/settings?app=green-pulse
 */
export function getEzauthUrl(
  ezauthWebUrl: string,
  path: string,
  locale: string = 'en',
  app?: string
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = `${ezauthWebUrl}/${locale}${normalizedPath}`
  const url = new URL(base)
  if (app) url.searchParams.set('app', app)
  return url.toString()
}
