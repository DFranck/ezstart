'use client'

import { useState, useMemo } from 'react'
import { categories, categoryToSlug, componentToSlug } from '@ezstart/auth-sdk/components/registry'
import { Aside, Badge, Button, Div, Icon, Input, P, Span } from '@ezstart/ui/components'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

/**
 * Tree-style sidebar for the `/components` showcase. Categories are
 * collapsible; each category renders its components as nested links.
 * The active route (matched via `usePathname`) is highlighted. Mobile =
 * the sidebar collapses to a slide-in drawer toggled by the burger
 * button at the top.
 */
export function ComponentSidebar() {
  const pathname = usePathname()
  const t = useTranslations('components')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const lower = search.toLowerCase()
    return categories
      .map(cat => ({
        ...cat,
        components: cat.components.filter(c => c.toLowerCase().includes(lower)),
      }))
      .filter(cat => cat.components.length > 0 || cat.name.toLowerCase().includes(lower))
  }, [search])

  return (
    <>
      {/* Mobile toggle — anchored just below the showcase top bar (h-14). */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="lg:hidden fixed left-2 top-[3.75rem] z-30"
        onClick={() => setOpen(true)}
        aria-label={t('sidebarOpen')}
      >
        <Icon name="lucide:Menu" className="h-5 w-5" />
      </Button>

      {/* Mobile backdrop */}
      {open && (
        <Div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <Aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:z-auto',
        ].join(' ')}
      >
        <Div className="shrink-0 border-b px-4 py-3 space-y-2">
          <Div className="flex items-center justify-between">
            <Link
              href="/docs/components"
              className="text-sm font-semibold tracking-tight hover:text-primary transition-colors"
              onClick={() => setOpen(false)}
            >
              {t('sidebarTitle')}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setOpen(false)}
              aria-label={t('sidebarClose')}
            >
              <Icon name="lucide:X" className="h-4 w-4" />
            </Button>
          </Div>
          <Input
            type="search"
            placeholder={t('sidebarSearchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </Div>

        <Div className="flex-1 overflow-y-auto px-2 py-3">
          <nav aria-label={t('sidebarNavLabel')}>
            <ul className="space-y-3">
              {filteredCategories.map(cat => {
                const catSlug = categoryToSlug(cat.name)
                return (
                  <li key={cat.name}>
                    <Div className="mb-1 flex items-center justify-between px-2">
                      <Link
                        href={`/docs/components/${catSlug}`}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {cat.name}
                      </Link>
                      <Badge variant="outline" size="xs" className="font-mono">
                        {cat.components.length}
                      </Badge>
                    </Div>
                    <ul className="space-y-0.5">
                      {cat.components.map(name => {
                        const slug = componentToSlug(name)
                        const href = `/docs/components/${catSlug}/${slug}`
                        const active = pathname.endsWith(`/docs/components/${catSlug}/${slug}`)
                        return (
                          <li key={name}>
                            <Link
                              href={href}
                              onClick={() => setOpen(false)}
                              className={[
                                'block rounded-md px-3 py-1.5 text-sm transition-colors',
                                active
                                  ? 'bg-accent text-accent-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                              ].join(' ')}
                              aria-current={active ? 'page' : undefined}
                            >
                              {name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
              {filteredCategories.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('sidebarEmpty')}
                </li>
              )}
            </ul>
          </nav>
        </Div>

        <Div className="shrink-0 border-t px-4 py-3 space-y-1">
          <P className="text-[10px] text-muted-foreground/80">{t('sidebarShortcutHint')}</P>
          <Div className="flex items-center gap-1">
            <Span className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </Span>
            <Span className="text-[10px] text-muted-foreground">/</Span>
            <Span className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl K
            </Span>
          </Div>
        </Div>
      </Aside>
    </>
  )
}
