// apps/green-pulse/web/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: string): string {
  // You can customize this mapping based on your needs
  const timeZoneMap: Record<string, string> = {
    en: 'UTC',
    fr: 'Europe/Paris',
    // Add more locales as needed
  }

  return timeZoneMap[locale] || 'UTC'
}
