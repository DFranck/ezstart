// apps/green-pulse/web/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en', 'vi'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: string): string {
  // You can customize this mapping based on your needs
  const timeZoneMap: Record<string, string> = {
    en: 'UTC',
    fr: 'Europe/Paris',
    vi: 'Asia/Ho_Chi_Minh',
  }

  return timeZoneMap[locale] || 'UTC'
}
