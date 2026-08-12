import { ArticleCard } from '@/components/articles/article-card'
import { formatArticleDate, getAllArticles } from '@/lib/articles'
import { Div, H1, Main, P, Section } from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'articles' })
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: { canonical: '/articles' },
    robots: { index: true, follow: true },
  }
}

export default async function ArticlesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'articles' })
  const articles = getAllArticles()

  return (
    <Main withHeaderOffset>
      <Section className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <Div className="text-center space-y-4 max-w-2xl mx-auto">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-xl text-muted-foreground">{t('lead')}</P>
        </Div>

        {articles.length === 0 ? (
          <P className="text-center text-muted-foreground py-12">{t('empty')}</P>
        ) : (
          <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(article => (
              <ArticleCard
                key={article.slug}
                article={article}
                dateFormatted={formatArticleDate(article.date, locale)}
                readingLabel={t('readingTime', { minutes: article.readingMinutes })}
                readMoreLabel={t('readMore')}
              />
            ))}
          </Div>
        )}
      </Section>
    </Main>
  )
}
