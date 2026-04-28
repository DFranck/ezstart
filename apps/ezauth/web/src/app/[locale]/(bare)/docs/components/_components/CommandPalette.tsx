'use client'

import { useEffect, useState } from 'react'
import {
  componentRegistry,
  categoryToSlug,
  componentToSlug,
} from '@ezstart/auth-sdk/components/registry'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Span,
} from '@ezstart/ui/components'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'

/**
 * Cmd+K command palette — fuzzy-search across all auth-sdk components,
 * grouped by category. On select, navigates to
 * `/{locale}/components/<category>/<component>`.
 *
 * Listens for `Cmd+K` (macOS) and `Ctrl+K` (Windows/Linux) globally so
 * it works on every page in the showcase.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('components')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Group entries by category for visual organisation
  const grouped = componentRegistry.reduce<Record<string, typeof componentRegistry>>(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = []
      acc[entry.category]!.push(entry)
      return acc
    },
    {}
  )
  const categoryNames = Object.keys(grouped).sort()

  function go(catName: string, componentName: string) {
    const href = `/${locale}/docs/components/${categoryToSlug(catName)}/${componentToSlug(componentName)}`
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('paletteTitle')}
      description={t('paletteDescription')}
    >
      <CommandInput placeholder={t('palettePlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('paletteEmpty')}</CommandEmpty>
        {categoryNames.map(catName => (
          <CommandGroup key={catName} heading={catName}>
            {grouped[catName]!.map(entry => (
              <CommandItem
                key={entry.name}
                value={`${catName} ${entry.name}`}
                onSelect={() => go(catName, entry.name)}
              >
                <Span className="font-medium">{entry.name}</Span>
                {entry.summary && (
                  <Span className="ml-2 truncate text-xs text-muted-foreground">
                    {entry.summary}
                  </Span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
