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

  const [
    common,
    header,
    footer,
    nav,
    home,
    skills,
    projects,
    contact,
    legal,
    libraries,
  ] = await Promise.all([
    // common
    import(`../messages/${locale}/common.json`),
    // layout
    import(`../messages/${locale}/layout/header.json`),
    import(`../messages/${locale}/layout/footer.json`),
    import(`../messages/${locale}/layout/nav.json`),
    // "/"
    import(`../messages/${locale}/home/home.json`),
    import(`../messages/${locale}/home/skills.json`),
    import(`../messages/${locale}/home/projects.json`),
    import(`../messages/${locale}/home/contact.json`),

    import(`../messages/${locale}/legal-notices.json`),
    import(`../messages/${locale}/libraries.json`),
  ]);

  return {
    locale,
    messages: merge.all([
      common.default,
      header.default,
      footer.default,
      nav.default,
      home.default,
      skills.default,
      projects.default,
      contact.default,
      legal.default,
      libraries.default,
    ]),
  };
});
