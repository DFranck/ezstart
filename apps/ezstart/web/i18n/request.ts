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

  const [header, footer, nav, home, legal, contact, projects, libraries] =
    await Promise.all([
      // layout
      import(`../messages/${locale}/header.json`),
      import(`../messages/${locale}/footer.json`),
      import(`../messages/${locale}/nav.json`),
      // paths
      // "/"
      import(`../messages/${locale}/home/home.json`),
      import(`../messages/${locale}/home/skills.json`),
      import(`../messages/${locale}/home/projects.json`),
      import(`../messages/${locale}/home/contact.json`),
      // "/legal-notices"
      import(`../messages/${locale}/legal-notices.json`),
      // maping content
      import(`../messages/${locale}/contact.json`),
      import(`../messages/${locale}/libraries.json`),
    ]);

  return {
    locale,
    messages: merge.all([
      header.default,
      footer.default,
      nav.default,
      home.default,
      legal.default,
      contact.default,
      projects.default,
      libraries.default,
    ]),
  };
});
