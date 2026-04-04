'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button, Div, H1, P } from '@ezstart/ui/components'

const tabs = [
  { key: 'all', href: '/test' },
  { key: 'donate', href: '/test/donate' },
  { key: 'purchase', href: '/test/purchase' },
  { key: 'subscribe', href: '/test/subscribe' },
] as const

export function TestNav() {
  const t = useTranslations('test')
  const pathname = usePathname()

  // Extract locale from pathname (e.g. /fr/test/donate -> fr)
  const locale = pathname.split('/')[1] || 'fr'

  return (
    <Div className="mb-8">
      <Div className="mb-4">
        <H1 className="text-3xl font-bold">{t('title')}</H1>
        <P variant="description" className="mt-1">
          {t('subtitle')}
        </P>
      </Div>
      <Div className="flex flex-wrap gap-2">
        {tabs.map(({ key, href }) => {
          const fullHref = `/${locale}${href}`
          const isActive = key === 'all' ? pathname === fullHref : pathname.startsWith(fullHref)

          return (
            <Button key={key} asChild variant={isActive ? 'default' : 'outline'} size="sm">
              <Link href={fullHref}>{t(`tabs.${key}`)}</Link>
            </Button>
          )
        })}
      </Div>
    </Div>
  )
}
