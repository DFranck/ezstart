import { notFound } from 'next/navigation'
import {
  categoryToSlug,
  componentRegistry,
  componentToSlug,
  getCategoryBySlug,
} from '@ezstart/auth-sdk/components/registry'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  P,
  Section,
} from '@ezstart/ui/components'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

type Props = { params: Promise<{ category: string; locale: string }> }

export async function generateStaticParams() {
  const seen = new Set<string>()
  const params: Array<{ category: string }> = []
  for (const entry of componentRegistry) {
    const slug = categoryToSlug(entry.category)
    if (!seen.has(slug)) {
      seen.add(slug)
      params.push({ category: slug })
    }
  }
  return params
}

export default async function CategoryPage({ params }: Props) {
  const { category: categorySlug } = await params
  const category = getCategoryBySlug(categorySlug)
  if (!category) notFound()

  const t = await getTranslations('components')
  const entries = category.components
    .map(name => componentRegistry.find(c => c.name === name))
    .filter((e): e is (typeof componentRegistry)[number] => Boolean(e))

  return (
    <Div className="mx-auto max-w-5xl space-y-8">
      <Div className="space-y-3">
        <Link
          href="/components"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t('categoryBackToOverview')}
        </Link>
        <H1 size="h2">{category.name}</H1>
        <P className="text-muted-foreground">
          {t('categoryComponentCount', { count: entries.length })}
        </P>
      </Div>

      <Section>
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => {
            const href = `/components/${categorySlug}/${componentToSlug(entry.name)}`
            return (
              <Link key={entry.name} href={href} className="block">
                <Card
                  variant="default"
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md h-full"
                >
                  <CardHeader className="pb-2">
                    <Div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-mono">{entry.name}</CardTitle>
                      {entry.isCompound && (
                        <Badge variant="secondary" size="xs" className="shrink-0">
                          {t('categoryCompoundBadge')}
                        </Badge>
                      )}
                    </Div>
                  </CardHeader>
                  <CardContent>
                    <P className="text-xs text-muted-foreground line-clamp-3">
                      {entry.summary || t('categoryNoSummary')}
                    </P>
                    <Div className="mt-3 flex flex-wrap gap-1">
                      <Badge variant="outline" size="xs">
                        {t('categoryPropsCount', { count: entry.props.length })}
                      </Badge>
                      {entry.examples.length > 0 && (
                        <Badge variant="outline" size="xs">
                          {t('categoryExamplesCount', { count: entry.examples.length })}
                        </Badge>
                      )}
                    </Div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </Div>
      </Section>
    </Div>
  )
}
