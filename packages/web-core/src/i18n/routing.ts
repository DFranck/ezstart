import { defineRouting } from 'next-intl/routing'

export const defaultRouting = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof defaultRouting.locales)[number]

export function getTimeZoneFromLocale(locale: AppLocale): string {
  switch (locale) {
    case 'fr':
      return 'Europe/Paris'
    case 'en':
      return 'America/New_York'
    default:
      return 'UTC'
  }
}

// Fonction pour créer une config i18n personnalisée si besoin
export function createRouting(config?: {
  locales?: string[]
  defaultLocale?: string
  localeDetection?: boolean
}) {
  return defineRouting({
    locales: config?.locales || defaultRouting.locales,
    defaultLocale: config?.defaultLocale || defaultRouting.defaultLocale,
    localeDetection: config?.localeDetection ?? defaultRouting.localeDetection,
  })
}