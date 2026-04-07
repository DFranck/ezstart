import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && (routing.locales as readonly string[]).includes(locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const finalLocale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const [common, home, forms, chat, careers, payment] = await Promise.all([
    import(`../messages/${finalLocale}/common.json`),
    import(`../messages/${finalLocale}/home.json`),
    import(`../messages/${finalLocale}/forms.json`),
    import(`../messages/${finalLocale}/chat.json`),
    import(`../messages/${finalLocale}/careers.json`),
    import(`../messages/${finalLocale}/payment.json`),
  ])

  return {
    locale: finalLocale,
    timeZone: 'UTC',
    messages: {
      ...common.default,
      ...home.default,
      ...careers.default,
      forms: forms.default,
      chat: chat.default,
      ...payment.default,
    },
  }
})
