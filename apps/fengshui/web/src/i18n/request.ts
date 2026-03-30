// apps/fengshui/web/i18n/request.ts
import merge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && (routing.locales as readonly string[]).includes(locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const [common, baguaBase, baguaStars] = await Promise.all([
    // Main UI translations
    import(`../messages/${locale}/index.json`),
    // Bagua configuration
    import(`../messages/${locale}/base.json`),
    import(`../messages/${locale}/stars.json`),
  ])

  return {
    locale,
    messages: merge.all([
      common.default,
      {
        bagua: merge(baguaBase.default, { stars: baguaStars.default }),
      },
    ]),
  }
})
