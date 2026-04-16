// apps/ezauth/web/src/i18n/request.ts
import merge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && (routing.locales as readonly string[]).includes(locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  // Always load `en` as a fallback base so any missing keys in a non-default
  // locale fall back to English rather than rendering the raw key.
  const [commonEn, authEn, adminEn, developerEn, common, auth, admin, developer] =
    await Promise.all([
      import(`../messages/en/common.json`),
      import(`../messages/en/auth.json`),
      import(`../messages/en/admin.json`),
      import(`../messages/en/developer.json`),
      import(`../messages/${locale}/common.json`),
      import(`../messages/${locale}/auth.json`),
      import(`../messages/${locale}/admin.json`),
      import(`../messages/${locale}/developer.json`),
    ])

  return {
    locale,
    messages: merge.all([
      commonEn.default,
      authEn.default,
      adminEn.default,
      developerEn.default,
      common.default,
      auth.default,
      admin.default,
      developer.default,
    ]),
  }
})
