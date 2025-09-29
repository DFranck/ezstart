// apps/fengshui/web/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en', 'es'],
  defaultLocale: 'fr',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: AppLocale): string {
  switch (locale) {
    case 'fr':
      return 'Europe/Paris'
    case 'en':
      return 'America/New_York'
    case 'es':
      return 'Europe/Madrid'
    default:
      return 'UTC'
  }
}