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
  const [
    commonEn,
    authEn,
    adminEn,
    developerEn,
    accountEn,
    dashboardEn,
    subscribeEn,
    legalEn,
    componentsEn,
    common,
    auth,
    admin,
    developer,
    account,
    dashboard,
    subscribe,
    legal,
    components,
  ] = await Promise.all([
    import(`../messages/en/common.json`),
    import(`../messages/en/auth.json`),
    import(`../messages/en/admin.json`),
    import(`../messages/en/developer.json`),
    import(`../messages/en/account.json`),
    import(`../messages/en/dashboard.json`),
    import(`../messages/en/subscribe.json`),
    import(`../messages/en/legal.json`),
    import(`../messages/en/components.json`),
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/auth.json`),
    import(`../messages/${locale}/admin.json`),
    import(`../messages/${locale}/developer.json`),
    import(`../messages/${locale}/account.json`),
    import(`../messages/${locale}/dashboard.json`),
    import(`../messages/${locale}/subscribe.json`),
    import(`../messages/${locale}/legal.json`),
    import(`../messages/${locale}/components.json`),
  ])

  return {
    locale,
    messages: merge.all([
      commonEn.default,
      authEn.default,
      adminEn.default,
      developerEn.default,
      accountEn.default,
      dashboardEn.default,
      subscribeEn.default,
      legalEn.default,
      componentsEn.default,
      common.default,
      auth.default,
      admin.default,
      developer.default,
      account.default,
      dashboard.default,
      subscribe.default,
      legal.default,
      components.default,
    ]),
  }
})
