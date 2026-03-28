import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: string): string {
  const timeZoneMap: Record<string, string> = {
    en: 'UTC',
    fr: 'Europe/Paris',
  }

  return timeZoneMap[locale] || 'UTC'
}
