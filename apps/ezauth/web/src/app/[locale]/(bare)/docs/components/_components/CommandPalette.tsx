'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { buildShowcaseTree } from '../_lib/grouping'

/**
 * Cmd+K command palette — fuzzy-search across the auth-sdk component
 * registry, projected onto the new 8-domain showcase tree (matches the
 * sidebar grouping). On select, navigates to the variant's detail
 * page.
 *
 * Listens for `Cmd+K` (macOS) and `Ctrl+K` (Windows/Linux) globally.
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

  const sections = useMemo(() => buildShowcaseTree(componentRegistry), [])

  function go(componentName: string) {
    const entry = componentRegistry.find(c => c.name === componentName)
    if (!entry) return
    const href = `/${locale}/docs/components/${categoryToSlug(entry.category)}/${componentToSlug(entry.name)}`
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
        {sections.map(section => (
          <CommandGroup key={section.key} heading={t(`domain.${section.key}.title`)}>
            {section.entries.flatMap(entry => {
              if (entry.kind === 'feature') {
                return entry.group.variants.map(v => (
                  <CommandItem
                    key={`${entry.group.slug}-${v.label}`}
                    value={`${entry.group.name} ${v.entry.name} ${v.label}`}
                    onSelect={() => go(v.entry.name)}
                  >
                    <Span className="font-medium">{entry.group.name}</Span>
                    <Span className="ml-2 text-xs text-muted-foreground font-mono">{v.label}</Span>
                    {v.entry.summary && (
                      <Span className="ml-2 truncate text-xs text-muted-foreground">
                        {v.entry.summary}
                      </Span>
                    )}
                  </CommandItem>
                ))
              }
              const single = entry.entry
              return [
                <CommandItem
                  key={single.name}
                  value={`${section.key} ${single.name}`}
                  onSelect={() => go(single.name)}
                >
                  <Span className="font-medium">{single.name}</Span>
                  {single.summary && (
                    <Span className="ml-2 truncate text-xs text-muted-foreground">
                      {single.summary}
                    </Span>
                  )}
                </CommandItem>,
              ]
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
