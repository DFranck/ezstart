import { en } from './locales/en.js'
import { fr } from './locales/fr.js'
import { vi } from './locales/vi.js'

export type AuthLocale = 'en' | 'fr' | 'vi'

// Widen `as const` literal types to `string` so FR/VI translations
// (which use different string values) are structurally assignable.
type Widen<T> = {
  [K in keyof T]: T[K] extends object ? Widen<T[K]> : string
}

export type AuthDict = Widen<typeof en>
export type FormKey = keyof AuthDict

// Cast EN (readonly literals) to the widened shape for the map.
const locales: Record<AuthLocale, AuthDict> = { en: en as AuthDict, fr, vi }

const SUPPORTED: ReadonlyArray<AuthLocale> = ['en', 'fr', 'vi']

function normalizeLocale(locale: AuthLocale | string | undefined): AuthLocale {
  if (!locale) return 'en'
  // Accept full tags like "fr-FR", "vi-VN" — match on primary subtag.
  const primary = locale.toLowerCase().split('-')[0] ?? ''
  return (SUPPORTED as ReadonlyArray<string>).includes(primary) ? (primary as AuthLocale) : 'en'
}

/**
 * Get localized texts for a given auth form.
 * - Falls back to EN when the locale is not supported.
 * - Shallow-merges with EN so any key missing in the target locale is filled with EN.
 *
 * @example
 *   const texts = getAuthTexts('vi', 'signUp')
 *   // Use `texts` directly or spread-override: { ...texts, title: 'Custom' }
 */
export function getAuthTexts<K extends FormKey>(
  locale: AuthLocale | string | undefined,
  form: K
): AuthDict[K] {
  const safe = normalizeLocale(locale)
  const dict = locales[safe] ?? locales.en
  // Shallow merge: EN fallback for missing keys.
  const enForm = locales.en[form] as Record<string, string>
  const localizedForm = dict[form] as Record<string, string>
  return { ...enForm, ...localizedForm } as AuthDict[K]
}

export { en, fr, vi }
