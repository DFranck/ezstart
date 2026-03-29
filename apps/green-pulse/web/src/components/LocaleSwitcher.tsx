'use client'

import { Dropdown, DropdownItem, Icon, Span } from '@ezstart/ui/components'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: string) => {
    // Replace current locale in pathname with new locale
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  const items: DropdownItem[] = LOCALES.map(({ code, label }) => ({
    label,
    value: code,
    onSelect: () => handleLocaleChange(code),
  }))

  const activeLabel = LOCALES.find(l => l.code === locale)?.label ?? locale
  const triggerLabel = (
    <>
      <Icon name="lucide:Globe" />
      <Span className="align-middle hidden md:inline">{activeLabel}</Span>
    </>
  )

  return <Dropdown label={triggerLabel} items={items} />
}
