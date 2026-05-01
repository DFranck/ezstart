// apps/ezstart/web/i18n/request.ts
import merge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return locale !== undefined && (routing.locales as readonly string[]).includes(locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const [
    common,
    header,
    footer,
    nav,
    home,
    skills,
    projects,
    contact,
    support,
    legal,
    packages,
    tools,
    qrCode,
    cvGenerator,
    businessCard,
    monitoring,
    admin,
    donate,
    saasPreview,
    status,
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
    import(`../messages/${locale}/home/support.json`),

    import(`../messages/${locale}/legal-notices.json`),
    import(`../messages/${locale}/packages.json`),
    import(`../messages/${locale}/tools.json`),
    // tools
    import(`../messages/${locale}/tools/qr-code.json`),
    import(`../messages/${locale}/tools/cv-generator.json`),
    import(`../messages/${locale}/tools/business-card.json`),
    // monitoring
    import(`../messages/${locale}/monitoring.json`),
    // admin
    import(`../messages/${locale}/admin.json`),
    // donate
    import(`../messages/${locale}/donate.json`),
    // saas-preview (draft landing)
    import(`../messages/${locale}/saas-preview.json`),
    // status (public)
    import(`../messages/${locale}/status.json`),
  ])

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
      support.default,
      legal.default,
      packages.default,
      tools.default,
      qrCode.default,
      cvGenerator.default,
      businessCard.default,
      monitoring.default,
      admin.default,
      donate.default,
      saasPreview.default,
      status.default,
    ]),
  }
})
