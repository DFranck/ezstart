'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Badge, Card, CardContent, CardHeader, Div, P, Span } from '@ezstart/ui/components'
import {
  categoryToSlug,
  componentRegistry,
  componentToSlug,
} from '@ezstart/auth-sdk/components/registry'
import { useTranslations } from 'next-intl'
import { findFeatureGroupForComponent, variantLabelToSlug } from '../_lib/grouping'
import { ComponentShowcase } from './ComponentShowcase'
import { VariantTabs } from './VariantTabs'

interface FeatureVariantSwitcherProps {
  /**
   * Name of the component currently selected in the URL — `SignInForm`,
   * `SignInCard`, `SignInModal`. The switcher resolves the feature group
   * this name belongs to and renders the full Form/Card/Modal tabs at
   * the top.
   */
  initialComponentName: string
}

/**
 * Wraps `<ComponentShowcase>` with a feature-aware variant tab strip
 * (Form / Card / Modal). When the user picks a different variant, the
 * URL is updated to point at the new variant's detail page (so refresh
 * + share work) and the wrapped showcase re-renders with the new
 * registry entry.
 *
 * If the component is NOT part of a feature group, this is a thin
 * pass-through to `<ComponentShowcase>`.
 */
export function FeatureVariantSwitcher({ initialComponentName }: FeatureVariantSwitcherProps) {
  const t = useTranslations('components')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Feature group resolved from the initial component name (cheap lookup
  // — recomputed only when the URL component changes).
  const group = useMemo(
    () => findFeatureGroupForComponent(initialComponentName, componentRegistry),
    [initialComponentName]
  )

  // Active variant resolution:
  //  1. `?variant=<slug>` URL param takes priority (deeplink-able).
  //  2. Otherwise infer from the component name in the URL.
  //  3. Otherwise default to the first variant.
  const variantParam = searchParams.get('variant')
  const variantFromComponent = group?.variants.find(v => v.entry.name === initialComponentName)
  const activeVariant = useMemo(() => {
    if (!group) return ''
    if (variantParam) {
      const match = group.variants.find(v => variantLabelToSlug(v.label) === variantParam)
      if (match) return variantLabelToSlug(match.label)
    }
    if (variantFromComponent) return variantLabelToSlug(variantFromComponent.label)
    return variantLabelToSlug(group.variants[0]!.label)
  }, [group, variantParam, variantFromComponent])

  // Resolve the active entry from the active variant slug. Used both to
  // render the showcase and to update the breadcrumb badge.
  const activeEntry = useMemo(() => {
    if (!group) return null
    return (
      group.variants.find(v => variantLabelToSlug(v.label) === activeVariant) ??
      group.variants[0] ??
      null
    )
  }, [group, activeVariant])

  // Whenever the active variant doesn't match the URL's component slug,
  // update the URL so refresh + share land on the right page. This fires
  // on user-initiated tab switch only — the initial render is a no-op
  // because the variant is inferred from the URL.
  useEffect(() => {
    if (!group || !activeEntry) return
    if (activeEntry.entry.name === initialComponentName) return

    const catSlug = categoryToSlug(activeEntry.entry.category)
    const compSlug = componentToSlug(activeEntry.entry.name)
    const target = `/docs/components/${catSlug}/${compSlug}?variant=${activeVariant}`

    // Replace (not push) so the back button doesn't cycle through every
    // variant the user clicked through.
    router.replace(target)
  }, [activeEntry, activeVariant, group, initialComponentName, pathname, router])

  function handleVariantChange(next: string) {
    if (!group) return
    const match = group.variants.find(v => variantLabelToSlug(v.label) === next)
    if (!match) return
    const catSlug = categoryToSlug(match.entry.category)
    const compSlug = componentToSlug(match.entry.name)
    router.replace(`/docs/components/${catSlug}/${compSlug}?variant=${next}`)
  }

  // Component is not a feature variant — render the showcase as-is.
  if (!group || !activeEntry) {
    const fallback = componentRegistry.find(c => c.name === initialComponentName)
    if (!fallback) return null
    return <ComponentShowcase entry={fallback} />
  }

  const variantOptions = group.variants.map(v => ({
    label: v.label,
    value: variantLabelToSlug(v.label),
  }))

  return (
    <Div className="space-y-6">
      <Card variant="default">
        <CardHeader className="space-y-3">
          <Div className="flex items-start justify-between gap-3">
            <Div className="space-y-1">
              <Span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('detailFeatureGroupLabel')}
              </Span>
              <P className="text-base font-medium">{group.name}</P>
            </Div>
            <Badge variant="primary" size="sm">
              {t('detailFeatureVariantsCount', { count: group.variants.length })}
            </Badge>
          </Div>
          <VariantTabs
            variants={variantOptions}
            activeVariant={activeVariant}
            onChange={handleVariantChange}
            ariaLabel={t('detailFeatureVariantsAriaLabel', { name: group.name })}
          />
        </CardHeader>
        <CardContent>
          <P className="text-xs text-muted-foreground">
            {t('detailFeatureVariantsHelp', { name: activeEntry.entry.name })}
          </P>
        </CardContent>
      </Card>

      <ComponentShowcase entry={activeEntry.entry} />
    </Div>
  )
}
