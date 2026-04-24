/**
 * Browser helpers to resolve the consumer's current theme preference
 * without a hard dependency on `next-themes`.
 *
 * The consumer app is assumed to use `next-themes` (or a compatible
 * library) which sets the class `dark` on `document.documentElement` and
 * writes a `theme` cookie with the user's stored preference. We read those
 * client-side signals to forward the preference via `?theme=` when the
 * user navigates to the EZAuth auth pages.
 *
 * Returning `undefined` is the safe fallback — the ezauth middleware
 * whitelists `'light' | 'dark' | 'system'` and silently drops anything
 * else, so callers can pass the value through without extra validation.
 */

/**
 * Theme preference value accepted by the ezauth middleware. Matches the
 * next-themes API (`theme` from `useTheme()`).
 */
export type ThemePreference = 'light' | 'dark' | 'system'

/**
 * Inspect the DOM to guess the consumer's current theme preference.
 *
 * Resolution order:
 * 1. `document.cookie` → read the `theme` cookie (set by next-themes when
 *    the user picked an explicit scheme, including `'system'`).
 * 2. `document.documentElement.dataset.theme` → some themes set this
 *    attribute directly.
 * 3. `document.documentElement.classList` → `'dark'` vs not → we can only
 *    report `'dark'` or `'light'` from this signal (no way to know if the
 *    value is tracking the OS or was set explicitly, so we conservatively
 *    report the resolved class).
 *
 * Returns `undefined` in SSR / Node / when no signal is available — the
 * caller then omits `?theme=` and ezauth falls back to its own default.
 *
 * @example
 *   const pref = detectCurrentThemePreference()
 *   // 'dark' | 'light' | 'system' | undefined
 */
export function detectCurrentThemePreference(): ThemePreference | undefined {
  if (typeof document === 'undefined') return undefined

  // 1. Cookie takes priority — it's the source of truth for next-themes
  //    when the user made an explicit choice (including 'system').
  const cookiePref = readThemeCookie(document.cookie)
  if (cookiePref) return cookiePref

  // 2. Check `data-theme` attribute (set by some themes).
  const root = document.documentElement
  const dataTheme = root.dataset.theme
  if (dataTheme === 'light' || dataTheme === 'dark' || dataTheme === 'system') {
    return dataTheme
  }

  // 3. Fallback to the resolved class. Can't distinguish 'system' from the
  //    explicit value, so we report the visible scheme.
  if (root.classList.contains('dark')) return 'dark'
  if (root.classList.contains('light')) return 'light'

  return undefined
}

/**
 * Parse the `theme` value from a `document.cookie` string. Exported for
 * tests; most callers want `detectCurrentThemePreference` instead.
 * @internal
 */
export function readThemeCookie(cookieString: string): ThemePreference | undefined {
  if (!cookieString) return undefined
  const match = cookieString.match(/(?:^|;\s*)theme=([^;]+)/)
  if (!match) return undefined
  const raw = decodeURIComponent(match[1] ?? '').trim()
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return undefined
}
