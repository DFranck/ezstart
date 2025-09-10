// apps/ezstart/web/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: AppLocale): string {
  switch (locale) {
    // case 'fr':
    //   return 'Europe/Paris';
    case 'en':
      return 'America/New_York'
    default:
      return 'UTC'
  }
}
