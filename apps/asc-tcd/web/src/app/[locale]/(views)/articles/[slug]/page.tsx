import { formatArticleDate, getAllArticleSlugs, getArticleBySlug } from '@/lib/articles'
import { Link } from '@/i18n/navigation'
import { getCanonicalUrl } from '@ezstart/config/urls'
import {
  Article as ArticleTag,
  Badge,
  Button,
  Div,
  H1,
  Main,
  MarkdownContent,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return getAllArticleSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/articles/${article.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      publishedTime: article.date || undefined,
      authors: [article.author],
      tags: article.tags,
      images: article.cover ? [{ url: article.cover }] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const t = await getTranslations({ locale, namespace: 'articles' })
  const dateFormatted = formatArticleDate(article.date, locale)
  const url = `${getCanonicalUrl('asc-tcd', 'web')}/${locale}/articles/${article.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date || undefined,
    dateModified: article.date || undefined,
    author: { '@type': 'Organization', name: article.author },
    image: article.cover ? [article.cover] : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: locale,
  }

  return (
    <Main withHeaderOffset>
      <Script
        id={`article-jsonld-${article.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section className="max-w-3xl mx-auto px-4 py-12">
        <Button asChild variant="ghost" size="sm" className="mb-8 -ml-2">
          <Link href="/articles">← {t('backToList')}</Link>
        </Button>

        <ArticleTag className="space-y-6">
          <Div className="space-y-4">
            <Div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Span>{t('publishedOn', { date: dateFormatted })}</Span>
              <Span aria-hidden="true">·</Span>
              <Span>{t('readingTime', { minutes: article.readingMinutes })}</Span>
            </Div>
            <H1 className="text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</H1>
            <P className="text-lg text-muted-foreground">{article.description}</P>
            {article.tags.length > 0 && (
              <Div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <Badge key={tag} variant="outline" size="xs" className="text-muted-foreground">
                    {tag}
                  </Badge>
                ))}
              </Div>
            )}
          </Div>

          {article.cover && (
            <Div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image
                src={article.cover}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </Div>
          )}

          <MarkdownContent content={article.content} />
        </ArticleTag>
      </Section>
    </Main>
  )
}
