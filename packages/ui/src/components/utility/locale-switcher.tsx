'use client'

import { capitalize } from '../../utils'
import { Icon } from '../icon'
import { Dropdown, DropdownItem } from '../navigation/dropdown'

interface LocaleSwitcherProps {
  locales: string[]
  currentLocale: string
  onLocaleChange: (locale: string) => void
}

export function LocaleSwitcher({ locales, currentLocale, onLocaleChange }: LocaleSwitcherProps) {
  const items: DropdownItem[] = locales.map(code => {
    const nativeName = new Intl.DisplayNames([code], { type: 'language' }).of(code)
    return {
      label: capitalize(nativeName ?? code),
      value: code,
      onSelect: () => onLocaleChange(code),
    }
  })

  const activeLabel = items.find(i => i.value === currentLocale)?.label ?? currentLocale
  const triggerLabel = (
    <>
      <Icon name="lucide:Globe" />
      {/* <span className="align-middle hidden md:inline">{activeLabel}</span> */}
    </>
  )

  return <Dropdown label={triggerLabel} items={items} />
}
