// apps/web/i18n/request.ts
import merge from 'deepmerge';
import { getRequestConfig } from 'next-intl/server';
import { getTimeZoneFromLocale, routing } from './routing';

function isSupportedLocale(
  locale: string | undefined
): locale is (typeof routing.locales)[number] {
  return locale !== undefined && routing.locales.includes(locale as any);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale;
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale;
  const timeZone = getTimeZoneFromLocale(locale);

  const [common, header, footer, nav, home] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/header.json`),
    import(`../messages/${locale}/footer.json`),
    import(`../messages/${locale}/nav.json`),
    import(`../messages/${locale}/home.json`),
  ]);

  return {
    locale,
    timeZone,
    messages: merge.all([
      common.default,
      header.default,
      footer.default,
      nav.default,
      home.default,
    ]),
  };
});
