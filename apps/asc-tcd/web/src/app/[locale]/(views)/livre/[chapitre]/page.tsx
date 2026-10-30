import { BookMarkdown } from '@/components/book/book-markdown'
import { formatArticleDate } from '@/lib/articles'
import { BOOK, getAdjacentChapters, getAllChapterSlugs, getChapterBySlug } from '@/lib/book'
import { Link } from '@/i18n/navigation'
import { getCanonicalUrl } from '@ezstart/config/urls'
import {
  Article as ArticleTag,
  Badge,
  Button,
  Card,
  Div,
  H1,
  Main,
  Nav,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Script from 'next/script'

interface PageProps {
  params: Promise<{ locale: string; chapitre: string }>
}

export function generateStaticParams() {
  return getAllChapterSlugs().map(chapitre => ({ chapitre }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chapitre } = await params
  const chapter = getChapterBySlug(chapitre)
  if (!chapter) return {}
  const title = `${chapter.title} — ${BOOK.title}`

  return {
    title,
    description: chapter.description,
    alternates: { canonical: `/livre/${chapter.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      title,
      description: chapter.description,
      modifiedTime: chapter.updated || undefined,
      authors: [BOOK.author],
      images: chapter.cover ? [{ url: chapter.cover }] : undefined,
    },
  }
}

export default async function ChapterPage({ params }: PageProps) {
  const { locale, chapitre } = await params
  setRequestLocale(locale)

  const chapter = getChapterBySlug(chapitre)
  if (!chapter) notFound()

  const t = await getTranslations({ locale, namespace: 'livre' })
  const { prev, next } = getAdjacentChapters(chapter.slug)
  const base = `${getCanonicalUrl('asc-tcd', 'web')}/${locale}`
  const url = `${base}/livre/${chapter.slug}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: chapter.title,
      description: chapter.description,
      dateModified: chapter.updated || undefined,
      datePublished: BOOK.datePublished,
      wordCount: chapter.wordCount,
      author: { '@type': 'Person', name: BOOK.author },
      publisher: { '@type': 'Organization', name: BOOK.publisher },
      image: chapter.cover ? [`${getCanonicalUrl('asc-tcd', 'web')}${chapter.cover}`] : undefined,
      isAccessibleForFree: true,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      isPartOf: { '@type': 'Book', '@id': `${base}/livre`, name: BOOK.title },
      position: chapter.order,
      inLanguage: locale,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('breadcrumb.home'), item: `${base}` },
        { '@type': 'ListItem', position: 2, name: t('breadcrumb.book'), item: `${base}/livre` },
        { '@type': 'ListItem', position: 3, name: chapter.title, item: url },
      ],
    },
  ]

  return (
    <Main withHeaderOffset>
      <Script
        id={`book-chapter-jsonld-${chapter.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section className="max-w-3xl mx-auto px-4 py-12">
        <Nav
          aria-label="breadcrumb"
          className="mb-8 !flex-row flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            {t('breadcrumb.home')}
          </Link>
          <Span aria-hidden="true"> / </Span>
          <Link href="/livre" className="hover:text-foreground">
            {t('breadcrumb.book')}
          </Link>
          <Span aria-hidden="true"> / </Span>
          <Span aria-current="page">{chapter.chapter}</Span>
        </Nav>

        <ArticleTag className="space-y-6">
          <Div className="space-y-4">
            <Div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" size="xs">
                {chapter.part}
              </Badge>
              <Span aria-hidden="true">·</Span>
              <Span>{t('readingTime', { minutes: chapter.readingMinutes })}</Span>
              <Span aria-hidden="true">·</Span>
              <Span>{t('updatedOn', { date: formatArticleDate(chapter.updated, locale) })}</Span>
            </Div>
            <Span className="block text-sm font-semibold uppercase tracking-wide text-primary">
              {chapter.chapter}
            </Span>
            <H1 className="text-3xl font-bold tracking-tight sm:text-4xl">{chapter.title}</H1>
            <P className="text-lg text-muted-foreground">{chapter.description}</P>
            <P className="text-sm text-muted-foreground">
              {t('byAuthor', { author: BOOK.author })} · {BOOK.title}
            </P>
          </Div>

          <BookMarkdown content={chapter.content} locale={locale} />
        </ArticleTag>

        <P className="mt-8 text-sm text-muted-foreground">
          {t('aiNote')}{' '}
          <a
            href={`/livre/${chapter.slug}.md`}
            className="text-primary underline underline-offset-2"
          >
            {t('rawMarkdown')}
          </a>
        </P>

        <Nav aria-label="pagination" className="mt-10 grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Card variant="floating" className="p-0">
              <Link href={`/livre/${prev.slug}`} className="block p-4">
                <Span className="block text-xs text-muted-foreground">← {t('previous')}</Span>
                <Span className="font-semibold">{prev.title}</Span>
              </Link>
            </Card>
          ) : (
            <Div />
          )}
          {next && (
            <Card variant="floating" className="p-0 sm:text-right">
              <Link href={`/livre/${next.slug}`} className="block p-4">
                <Span className="block text-xs text-muted-foreground">{t('next')} →</Span>
                <Span className="font-semibold">{next.title}</Span>
              </Link>
            </Card>
          )}
        </Nav>

        <Div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-6">
          <Div className="space-y-1">
            <P className="font-semibold">{t('ctaTitle')}</P>
            <P className="text-sm text-muted-foreground">{t('ctaText')}</P>
          </Div>
          <Div className="flex gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/livre">{t('backToBook')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/quote">{t('ctaButton')}</Link>
            </Button>
          </Div>
        </Div>
      </Section>
    </Main>
  )
}
