'use client'

import { Button, Div, Icon, LocaleSwitcher } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useLocale } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'

const LOCALES = ['en', 'fr', 'vi']

// Inline locale map for the back-link label. Bypasses next-intl on this one
// string because Turbopack caches the messages chunk on first compile and
// new keys added to `components.json` aren't picked up until a full dev
// server restart — annoying when the only consumer is a static top bar.
const BACK_LABEL: Record<string, string> = {
  en: 'Back to EZAuth',
  fr: 'Retour à EZAuth',
  vi: 'Quay lại EZAuth',
}

/**
 * Top bar for the `/components` showcase — replaces the public AppShell
 * header on this bare route. Provides back-to-home link + locale + theme.
 *
 * Auth state is intentionally NOT exposed here — the showcase is a
 * developer docs surface that renders identical content whether the
 * visitor is logged in or not. Adding a LoginButton would be visual
 * noise; users who need their dashboard go via "Retour à EZAuth".
 */
export function ShowcaseTopBar() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const backLabel = BACK_LABEL[locale] ?? BACK_LABEL.en

  return (
    <Div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link href="/">
          <Icon name="lucide:ArrowLeft" className="h-4 w-4" />
          <span>{backLabel}</span>
        </Link>
      </Button>
      <Div className="flex items-center gap-2">
        <LocaleSwitcher
          locales={LOCALES}
          currentLocale={locale}
          onLocaleChange={(next: string) => router.replace(pathname, { locale: next })}
        />
        <ThemeSwitcher />
      </Div>
    </Div>
  )
}
