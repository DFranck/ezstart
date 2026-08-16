'use client'

import { useState, useMemo } from 'react'
import {
  categoryToSlug,
  componentRegistry,
  componentToSlug,
} from '@ezstart/pay-sdk/components/registry'
import { Aside, Badge, Button, Div, Icon, Input, P, Span } from '@ezstart/ui/components'
import { Link, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { buildShowcaseTree, featureFallbackComponentName } from '../_lib/grouping'
import { InternalBadge } from './AdminInternalToggle'
import { useInternalToggle } from './InternalToggleContext'

/**
 * Tree-style sidebar for the `/docs/components` showcase. Domains
 * (Donations / Subscriptions / Billing & Pricing / ...) act as
 * collapsible headings; their entries render as nested links — feature
 * groups (Donate, Subscribe, ...) collapse their variants under a single
 * link pointing to the "primary" variant.
 *
 * Two click affordances on the headers:
 * - **Header label** → routes to `/docs/components?category=<key>` so the
 *   landing page can scroll-and-filter to that domain (deeplink-able).
 *   On detail pages, the header still navigates to
 *   `/docs/components?category=<key>` (back to the filtered landing).
 * - **Components** (children) → route to the existing detail pages.
 *
 * Active route is highlighted via `usePathname` for entries and via
 * `useSearchParams()` for the category header (when on the landing page).
 * Mobile = slide-in drawer.
 */
export function ComponentSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations('components')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { showInternal } = useInternalToggle()

  const sections = useMemo(
    () => buildShowcaseTree(componentRegistry, { showInternal }),
    [showInternal]
  )

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections
    const lower = search.toLowerCase()
    return sections
      .map(section => ({
        ...section,
        entries: section.entries.filter(entry => {
          if (entry.kind === 'feature') {
            return (
              entry.group.name.toLowerCase().includes(lower) ||
              entry.group.variants.some(v =>
                `${v.entry.name} ${v.label}`.toLowerCase().includes(lower)
              )
            )
          }
          return entry.entry.name.toLowerCase().includes(lower)
        }),
      }))
      .filter(section => section.entries.length > 0)
  }, [sections, search])

  // Normalize the landing-page pathname (the next-intl `usePathname` strips
  // the locale prefix). Active state for the "All" entry + header buttons
  // is keyed off this.
  const isLandingPage = pathname === '/docs/components' || pathname.endsWith('/docs/components')
  const activeCategoryParam = searchParams.get('category')
  const isAllActive = isLandingPage && (!activeCategoryParam || activeCategoryParam === 'all')

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
            <ul className="space-y-1">
              {/* "All" entry — clears the category filter and lands on the
                  full landing page. */}
              <li>
                <Link
                  href="/docs/components"
                  onClick={() => setOpen(false)}
                  className={[
                    'flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors mb-2',
                    isAllActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  ].join(' ')}
                  aria-current={isAllActive ? 'page' : undefined}
                >
                  <Span className="inline-flex items-center gap-2">
                    <Icon name="lucide:LayoutGrid" className="h-3.5 w-3.5" />
                    {t('sidebarAllEntry')}
                  </Span>
                </Link>
              </li>

              {filteredSections.map(section => {
                const isCategoryActive = isLandingPage && activeCategoryParam === section.key
                const headerHref = `/docs/components?category=${section.key}`
                return (
                  <li key={section.key} className="space-y-0.5">
                    {/* Category header — clickable, filters the landing
                        page via `?category=`. */}
                    <Link
                      href={headerHref}
                      onClick={() => setOpen(false)}
                      className={[
                        'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors',
                        isCategoryActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                      ].join(' ')}
                      aria-current={isCategoryActive ? 'page' : undefined}
                    >
                      <Span className="text-xs font-semibold uppercase tracking-wider">
                        {t(`domain.${section.key}.title`)}
                      </Span>
                      <Badge variant="outline" size="xs" className="font-mono">
                        {section.componentCount}
                      </Badge>
                    </Link>
                    <ul className="space-y-0.5">
                      {section.entries.map(entry => {
                        if (entry.kind === 'feature') {
                          const fallbackName = featureFallbackComponentName(entry.group)
                          const fallbackEntry = componentRegistry.find(c => c.name === fallbackName)
                          if (!fallbackEntry) return null
                          const catSlug = categoryToSlug(fallbackEntry.category)
                          const compSlug = componentToSlug(fallbackName)
                          const href = `/docs/components/${catSlug}/${compSlug}`
                          // Feature link is "active" if any of its variant pages
                          // is currently rendered.
                          const active = entry.group.variants.some(v => {
                            const vCatSlug = categoryToSlug(v.entry.category)
                            const vCompSlug = componentToSlug(v.entry.name)
                            return pathname.endsWith(`/docs/components/${vCatSlug}/${vCompSlug}`)
                          })
                          return (
                            <li key={`feat-${entry.group.slug}`}>
                              <Link
                                href={href}
                                onClick={() => setOpen(false)}
                                className={[
                                  'flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors',
                                  active
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                ].join(' ')}
                                aria-current={active ? 'page' : undefined}
                              >
                                <Span>{entry.group.name}</Span>
                                <Span className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono opacity-70">
                                  {entry.group.variants.map(v => v.label[0]).join('/')}
                                </Span>
                              </Link>
                            </li>
                          )
                        }
                        const single = entry.entry
                        const catSlug = categoryToSlug(single.category)
                        const compSlug = componentToSlug(single.name)
                        const href = `/docs/components/${catSlug}/${compSlug}`
                        const active = pathname.endsWith(`/docs/components/${catSlug}/${compSlug}`)
                        const isInternal = single.isInternal === true
                        return (
                          <li key={single.name}>
                            <Link
                              href={href}
                              onClick={() => setOpen(false)}
                              className={[
                                'flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                                active
                                  ? 'bg-accent text-accent-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                isInternal ? 'border border-dashed border-warning/40' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              aria-current={active ? 'page' : undefined}
                            >
                              <Span className="truncate">{single.name}</Span>
                              {isInternal && <InternalBadge />}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
              {filteredSections.length === 0 && (
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
