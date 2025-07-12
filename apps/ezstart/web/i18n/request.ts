// apps/ezstart/web/i18n/request.ts
import merge from 'deepmerge';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

function isSupportedLocale(
  locale: string | undefined
): locale is (typeof routing.locales)[number] {
  return locale !== undefined && routing.locales.includes(locale as any);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale;
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale;

  const [common, header, footer, nav, home, legal, contact, about, projects] =
    await Promise.all([
      import(`../messages/${locale}/common.json`),
      import(`../messages/${locale}/header.json`),
      import(`../messages/${locale}/footer.json`),
      import(`../messages/${locale}/nav.json`),
      import(`../messages/${locale}/home.json`),
      import(`../messages/${locale}/legal-notices.json`),
      import(`../messages/${locale}/contact.json`),
      import(`../messages/${locale}/about.json`),
      import(`../messages/${locale}/projects.json`),
    ]);

  return {
    locale,
    messages: merge.all([
      common.default,
      header.default,
      footer.default,
      nav.default,
      home.default,
      legal.default,
      contact.default,
      about.default,
      projects.default,
    ]),
  };
});
