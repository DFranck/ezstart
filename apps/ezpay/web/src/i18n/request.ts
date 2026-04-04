// apps/ezpay/web/src/i18n/request.ts
import merge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && (routing.locales as readonly string[]).includes(locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const [common, payment, layout, admin] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/payment.json`),
    import(`../messages/${locale}/layout.json`),
    import(`../messages/${locale}/admin.json`),
  ])

  return {
    locale,
    messages: merge.all([common.default, payment.default, layout.default, admin.default]),
  }
})
