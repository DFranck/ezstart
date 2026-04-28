import {
  categories,
  categoryToSlug,
  componentRegistry,
  getComponent,
} from '@ezstart/auth-sdk/components/registry'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  H2,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

/**
 * Showcase landing — `/{locale}/docs/components`. Renders a grid of category
 * cards with component count + 3-up preview chips. Click → category
 * overview. Server component (zero JS payload, fast first paint).
 */
export default async function ComponentsLandingPage() {
  const t = await getTranslations('components')

  return (
    <Div className="mx-auto max-w-5xl space-y-10">
      <Div className="space-y-3">
        <Badge variant="primary" size="sm" className="font-mono">
          @ezstart/auth-sdk
        </Badge>
        <H1 size="h1">{t('landingTitle')}</H1>
        <P className="text-lg text-muted-foreground">{t('landingSubtitle')}</P>
        <Div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" size="sm">
            {t('landingTotalComponents', { count: componentRegistry.length })}
          </Badge>
          <Badge variant="outline" size="sm">
            {t('landingTotalCategories', { count: categories.length })}
          </Badge>
          <Badge variant="outline" size="sm" className="font-mono">
            {t('landingShortcutHint')}
          </Badge>
        </Div>
      </Div>

      <Section className="space-y-4">
        <H2 size="h3">{t('landingCategoriesHeading')}</H2>
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const slug = categoryToSlug(cat.name)
            const previewNames = cat.components.slice(0, 3)
            return (
              <Link key={cat.name} href={`/docs/components/${slug}`} className="block group">
                <Card
                  variant="default"
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md h-full"
                >
                  <CardHeader className="pb-2">
                    <Div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      <Badge variant="secondary" size="sm" className="font-mono shrink-0">
                        {cat.components.length}
                      </Badge>
                    </Div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <P className="text-xs text-muted-foreground line-clamp-2">
                      {previewNames.join(' · ')}
                      {cat.components.length > 3 ? ` … +${cat.components.length - 3}` : ''}
                    </P>
                    <Div className="flex flex-wrap gap-1">
                      {previewNames.map(name => {
                        const entry = getComponent(name)
                        return (
                          <Badge
                            key={name}
                            variant="outline"
                            size="xs"
                            className="font-mono"
                            title={entry?.summary || undefined}
                          >
                            {name}
                          </Badge>
                        )
                      })}
                    </Div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </Div>
      </Section>

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
