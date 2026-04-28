import { notFound } from 'next/navigation'
import { getCategoryBySlug, getComponentBySlug } from '@ezstart/auth-sdk/components/registry'
import { Badge, Button, Div, H1, P, Span } from '@ezstart/ui/components'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { ComponentShowcase } from '../../_components/ComponentShowcase'

type Props = { params: Promise<{ category: string; component: string; locale: string }> }

// Demos use React.lazy + client-only hooks (auth context, sonner toasts,
// etc.) that crash during static prerender ("Cannot read properties of
// null (reading 'useContext')"). Render dynamically instead — the
// showcase is a developer tool, SSR-on-demand is fine.
export const dynamic = 'force-dynamic'

export default async function ComponentDetailPage({ params }: Props) {
  const { category: categorySlug, component: componentSlug } = await params
  const category = getCategoryBySlug(categorySlug)
  const entry = getComponentBySlug(componentSlug)
  if (!category || !entry || entry.category !== category.name) notFound()

  const t = await getTranslations('components')

  return (
    <Div className="mx-auto max-w-5xl space-y-6">
      <Div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/components"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('detailBreadcrumbRoot')}
        </Link>
        <Span className="text-muted-foreground">/</Span>
        <Link
          href={`/components/${categorySlug}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {category.name}
        </Link>
        <Span className="text-muted-foreground">/</Span>
        <Span className="font-mono font-medium">{entry.name}</Span>
      </Div>

      <Div className="space-y-3">
        <Div className="flex flex-wrap items-start justify-between gap-3">
          <Div className="space-y-1">
            <H1 size="h2" className="font-mono">
              {entry.name}
            </H1>
            <Div className="flex flex-wrap gap-2">
              <Badge variant="primary" size="sm">
                {category.name}
              </Badge>
              {entry.isCompound && (
                <Badge variant="secondary" size="sm">
                  {t('detailCompoundBadge')}
                </Badge>
              )}
              <Badge variant="outline" size="sm" className="font-mono">
                {entry.importPath}
              </Badge>
            </Div>
          </Div>
          <Button asChild variant="outline" size="sm">
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
              {t('detailViewSource')}
            </a>
          </Button>
        </Div>
        {entry.summary && <P className="text-base text-muted-foreground">{entry.summary}</P>}
      </Div>

      <ComponentShowcase entry={entry} />
    </Div>
  )
}
