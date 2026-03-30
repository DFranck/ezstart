import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && (routing.locales as readonly string[]).includes(locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const finalLocale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const messages = await import(`../messages/${finalLocale}.json`)

  return {
    locale: finalLocale,
    timeZone: 'UTC',
    messages: messages.default,
  }
})
