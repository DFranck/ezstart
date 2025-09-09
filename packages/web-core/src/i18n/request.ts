import { getRequestConfig } from 'next-intl/server'
import { defaultRouting } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !defaultRouting.locales.includes(locale as any)) {
    locale = defaultRouting.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})

// Fonction pour créer une config request personnalisée
export function createRequestConfig(messagesPath?: string) {
  return getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale

    if (!locale || !defaultRouting.locales.includes(locale as any)) {
      locale = defaultRouting.defaultLocale
    }

    const messagePath = messagesPath || `../../messages/${locale}.json`
    
    return {
      locale,
      messages: (await import(messagePath)).default,
    }
  })
}