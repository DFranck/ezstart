import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && routing.locales.includes(locale as any)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const finalLocale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const [common, home] = await Promise.all([
    import(`../messages/${finalLocale}/common.json`),
    import(`../messages/${finalLocale}/home.json`),
  ])

  return {
    locale: finalLocale,
    timeZone: 'UTC',
    messages: {
      ...common.default,
      ...home.default,
    },
  }
})
