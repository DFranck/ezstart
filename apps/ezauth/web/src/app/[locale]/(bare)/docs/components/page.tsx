'use client'

import {
  categoryToSlug,
  componentRegistry,
  componentToSlug,
} from '@ezstart/auth-sdk/components/registry'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  H2,
  Icon,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { buildShowcaseTree, variantLabelToSlug, type DomainKey } from './_lib/grouping'
import { AdminInternalToggle, InternalBadge } from './_components/AdminInternalToggle'
import { useInternalToggle } from './_components/InternalToggleContext'
import { VariantTabs } from './_components/VariantTabs'

/**
 * Showcase landing — `/{locale}/docs/components`. Renders the auth-sdk
 * registry projected into 8 high-level domains (Auth Forms, Auth Buttons,
 * User Profile, Dashboards, Applications & Keys, Guards & Banners,
 * Security, Audit). Variants of the same primitive (`SignInForm` /
 * `SignInCard` / `SignInModal`) collapse under one feature card.
 *
 * URL-driven filter — when `?category=<domain-key>` is present the page
 * scrolls to the matching section + greys out the others. Sidebar
 * category headers drive this. `?category=all` (or no param) shows
 * everything.
 *
 * Client component because it consumes the superadmin "Show internal"
 * toggle from `DocsInternalToggleProvider` to optionally surface
 * `@internal`-tagged shells (`AuthCardShell`, `AuthModalShell`) for
 * platform admins curating the public surface.
 */
export default function ComponentsLandingPage() {
  const t = useTranslations('components')
  const { showInternal } = useInternalToggle()
  const searchParams = useSearchParams()
  const activeCategory = (searchParams.get('category') ?? 'all') as DomainKey | 'all'

  const sections = useMemo(
    () => buildShowcaseTree(componentRegistry, { showInternal }),
    [showInternal]
  )
  const totalFeaturedEntries = sections.reduce((acc, s) => acc + s.entries.length, 0)
  const totalComponents = sections.reduce((acc, s) => acc + s.componentCount, 0)

  // Smooth-scroll to the active section when the URL filter changes.
  // Using `useEffect` so we only fire on actual category transitions, not
  // on every render.
  useEffect(() => {
    if (activeCategory === 'all') return
    const el = document.getElementById(`section-${activeCategory}`)
    if (!el) return
    // Defer so the DOM has rendered the (possibly filtered) section list.
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeCategory])

  return (
    <Div className="mx-auto max-w-6xl space-y-10">
      <Div className="space-y-3">
        <Div className="flex flex-wrap items-start justify-between gap-3">
          <Badge variant="primary" size="sm" className="font-mono">
            @ezstart/auth-sdk
          </Badge>
          <AdminInternalToggle />
        </Div>
        <H1 size="h1">{t('landingTitle')}</H1>
        <P className="text-lg text-muted-foreground">{t('landingSubtitle')}</P>
        <Div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" size="sm">
            {t('landingTotalComponents', { count: totalComponents })}
          </Badge>
          <Badge variant="outline" size="sm">
            {t('landingTotalEntries', { count: totalFeaturedEntries })}
          </Badge>
          <Badge variant="outline" size="sm">
            {t('landingTotalDomains', { count: sections.length })}
          </Badge>
          <Badge variant="outline" size="sm" className="font-mono">
            {t('landingShortcutHint')}
          </Badge>
          {activeCategory !== 'all' && (
            <Badge variant="primary" size="sm">
              {t('landingFilterActive', { name: t(`domain.${activeCategory}.title`) })}
            </Badge>
          )}
        </Div>
        {activeCategory !== 'all' && (
          <Div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/docs/components">
                <Icon name="lucide:X" className="h-3.5 w-3.5 mr-1" />
                {t('landingClearFilter')}
              </Link>
            </Button>
          </Div>
        )}
      </Div>

      {sections
        .filter(section => activeCategory === 'all' || section.key === activeCategory)
        .map(section => (
          <Section
            key={section.key}
            id={`section-${section.key}`}
            className="space-y-4 scroll-mt-20"
          >
            <Div className="flex items-baseline justify-between gap-3">
              <H2 size="h3">{t(`domain.${section.key}.title`)}</H2>
              <Badge variant="outline" size="sm" className="font-mono shrink-0">
                {t('landingComponentsInDomain', { count: section.componentCount })}
              </Badge>
            </Div>
            <P className="text-sm text-muted-foreground">
              {t(`domain.${section.key}.description`)}
            </P>

            <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.entries.map(entry => {
                if (entry.kind === 'feature') {
                  return (
                    <FeatureCard
                      key={`feature-${entry.group.slug}`}
                      group={entry.group}
                      featureBadgeLabel={t('landingFeatureBadge')}
                      switchLabel={t('landingFeatureSwitchLabel')}
                      detailLinkLabel={t('landingFeatureDetailLink')}
                    />
                  )
                }

                const single = entry.entry
                const categorySlug = categoryToSlug(single.category)
                const componentSlug = componentToSlug(single.name)
                const href = `/docs/components/${categorySlug}/${componentSlug}`
                const isInternal = single.isInternal === true
                return (
                  <Card
                    key={single.name}
                    variant="default"
                    className={[
                      'transition-all hover:border-primary/50 hover:shadow-md h-full flex flex-col',
                      isInternal ? 'border-dashed border-warning/40 bg-warning/5' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <CardHeader className="pb-2">
                      <Div className="flex items-start justify-between gap-2">
                        <Link href={href} className="block group min-w-0 flex-1">
                          <CardTitle className="text-base font-mono truncate group-hover:text-primary transition-colors">
                            {single.name}
                          </CardTitle>
                        </Link>
                        <Div className="flex items-center gap-1 shrink-0">
                          {isInternal && <InternalBadge />}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-label={t('detailViewSource')}
                            title={t('detailViewSource')}
                          >
                            <a href={single.sourceUrl} target="_blank" rel="noopener noreferrer">
                              <Icon name="lucide:Github" className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </Div>
                      </Div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-3">
                      <Link href={href} className="block group">
                        <P className="text-xs text-muted-foreground line-clamp-3 group-hover:text-foreground transition-colors">
                          {single.summary || t('categoryNoSummary')}
                        </P>
                      </Link>
                      <Div className="flex flex-wrap gap-1">
                        <Badge variant="outline" size="xs">
                          {t('categoryPropsCount', { count: single.props.length })}
                        </Badge>
                        {single.examples.length > 0 && (
                          <Badge variant="outline" size="xs">
                            {t('categoryExamplesCount', { count: single.examples.length })}
                          </Badge>
                        )}
                        {single.isCompound && (
                          <Badge variant="secondary" size="xs">
                            {t('categoryCompoundBadge')}
                          </Badge>
                        )}
                      </Div>
                    </CardContent>
                  </Card>
                )
              })}
            </Div>
          </Section>
        ))}

      <Section className="space-y-3 border-t pt-8">
        <H2 size="h4">{t('landingFooterTitle')}</H2>
        <P className="text-sm text-muted-foreground">{t('landingFooterDescription')}</P>
        <Div className="flex flex-wrap gap-2 text-sm">
          <Span className="font-mono rounded bg-muted px-2 py-1 text-xs">
            npm install @ezstart/auth-sdk
          </Span>
        </Div>
      </Section>
    </Div>
  )
}

/**
 * Card for a feature group with interactive variant tabs. The selected
 * variant drives both the displayed metadata (props count, summary) and
 * the "Open detail" link target — clicking through to e.g.
 * `/docs/components/forms/sign-in-card` lands on the right page.
 *
 * Variant choice is local state only (each feature card has its own
 * tabs) — it is NOT persisted to the URL because there can be many
 * feature cards on a single page and the URL would explode.
 */
function FeatureCard({
  group,
  featureBadgeLabel,
  switchLabel,
  detailLinkLabel,
}: {
  group: import('./_lib/grouping').FeatureGroup
  featureBadgeLabel: string
  switchLabel: string
  detailLinkLabel: string
}) {
  const [activeVariant, setActiveVariant] = useState<string>(
    variantLabelToSlug(group.variants[0]?.label ?? 'form')
  )

  const variantOptions = useMemo(
    () => group.variants.map(v => ({ label: v.label, value: variantLabelToSlug(v.label) })),
    [group.variants]
  )

  const activeEntry =
    group.variants.find(v => variantLabelToSlug(v.label) === activeVariant) ?? group.variants[0]
  if (!activeEntry) return null

  const categorySlug = categoryToSlug(activeEntry.entry.category)
  const componentSlug = componentToSlug(activeEntry.entry.name)
  const detailHref = `/docs/components/${categorySlug}/${componentSlug}?variant=${activeVariant}`

  return (
    <Card
      variant="default"
      className="transition-all hover:border-primary/50 hover:shadow-md h-full flex flex-col"
    >
      <CardHeader className="pb-2 space-y-3">
        <Div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{group.name}</CardTitle>
          <Badge variant="primary" size="xs" className="shrink-0">
            {featureBadgeLabel}
          </Badge>
        </Div>
        <Span className="sr-only">{switchLabel}</Span>
        <VariantTabs
          variants={variantOptions}
          activeVariant={activeVariant}
          onChange={setActiveVariant}
          ariaLabel={switchLabel}
        />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        <P className="text-xs text-muted-foreground line-clamp-3">
          {activeEntry.entry.summary || ''}
        </P>
        <Div className="flex items-center justify-between gap-2 pt-1">
          <Span className="text-[10px] font-mono text-muted-foreground truncate">
            {activeEntry.entry.name}
          </Span>
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1">
            <Link href={detailHref}>
              {detailLinkLabel}
              <Icon name="lucide:ArrowRight" className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Div>
      </CardContent>
    </Card>
  )
}
