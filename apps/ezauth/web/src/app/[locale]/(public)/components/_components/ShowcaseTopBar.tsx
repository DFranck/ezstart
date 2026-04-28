'use client'

import { LoginButton } from '@ezstart/auth-sdk'
import { Button, Div, Icon, LocaleSwitcher } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'

const LOCALES = ['en', 'fr', 'vi']

/**
 * Top bar for the `/components` showcase — replaces the public AppShell
 * header on this bare route. Provides back-to-home link + locale + theme
 * + LoginButton. The locale switcher swaps the URL's locale segment via
 * the next-intl router so the active page navigates without losing
 * context.
 */
export function ShowcaseTopBar() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('components')

  return (
    <Div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link href="/">
          <Icon name="lucide:ArrowLeft" className="h-4 w-4" />
          <span>{t('backToHome')}</span>
        </Link>
      </Button>
      <Div className="flex items-center gap-2">
        <LocaleSwitcher
          locales={LOCALES}
          currentLocale={locale}
          onLocaleChange={(next: string) => router.replace(pathname, { locale: next })}
        />
        <ThemeSwitcher />
        <LoginButton size="sm" />
      </Div>
    </Div>
  )
}
