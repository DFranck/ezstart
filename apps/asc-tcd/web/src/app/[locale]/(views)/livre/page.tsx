import { BOOK, getAllChapters, getBookPdfUrl } from '@/lib/book'
import { Link } from '@/i18n/navigation'
import { getCanonicalUrl } from '@ezstart/config/urls'
import {
  Badge,
  Button,
  Card,
  Div,
  H1,
  H2,
  H3,
  Main,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Script from 'next/script'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'livre' })
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: { canonical: '/livre' },
    robots: { index: true, follow: true },
    openGraph: { type: 'book', title: t('meta.title'), description: t('meta.description') },
  }
}

export default async function LivrePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'livre' })
  const chapters = getAllChapters()
  const pdfUrl = getBookPdfUrl()
  const base = `${getCanonicalUrl('asc-tcd', 'web')}/${locale}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${base}/livre`,
    name: BOOK.title,
    alternateName: BOOK.subtitle,
    description: BOOK.description,
    inLanguage: BOOK.language,
    isAccessibleForFree: true,
    datePublished: BOOK.datePublished,
    author: { '@type': 'Person', name: BOOK.author },
    publisher: { '@type': 'Organization', name: BOOK.publisher },
    url: `${base}/livre`,
    hasPart: chapters.map(chapter => ({
      '@type': 'Chapter',
      name: chapter.title,
      position: chapter.order,
      url: `${base}/livre/${chapter.slug}`,
    })),
  }

  const parts = Array.from(new Set(chapters.map(chapter => chapter.part)))

  return (
    <Main withHeaderOffset>
      <Script
        id="book-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        <Div className="grid gap-8 md:grid-cols-[minmax(0,16rem)_1fr] md:items-center">
          <Card
            variant="floating"
            className="flex aspect-[3/4] flex-col justify-between bg-primary p-6 text-primary-foreground"
          >
            <Span className="text-xs font-semibold uppercase tracking-widest">ASC-TCD</Span>
            <Div className="space-y-2">
              <Span className="block text-2xl font-bold leading-tight">
                Transplantation d&apos;arbres &amp; ODD
              </Span>
              <Span className="block text-sm opacity-90">{BOOK.subtitle}</Span>
            </Div>
            <Span className="text-sm font-medium">{BOOK.author}</Span>
          </Card>

          <Div className="space-y-5">
            <Badge variant="outline" size="xs" className="text-muted-foreground">
              {t('eyebrow')}
            </Badge>
            <H1 className="text-3xl font-bold tracking-tight sm:text-4xl">{BOOK.title}</H1>
            <P className="text-lg text-muted-foreground">{t('pitch')}</P>
            <P className="text-sm text-muted-foreground">
              {t('byAuthor', { author: BOOK.author })} ·{' '}
              {t('publisher', { publisher: BOOK.publisher })}
            </P>
            <Div className="flex flex-wrap gap-3">
              {chapters[0] && (
                <Button asChild>
                  <Link href={`/livre/${chapters[0].slug}`}>{t('startReading')}</Link>
                </Button>
              )}
              {pdfUrl && (
                <Button asChild variant="outline">
                  <a href={pdfUrl} download>
                    {t('downloadPdf')}
                  </a>
                </Button>
              )}
            </Div>
          </Div>
        </Div>

        <Section aria-labelledby="livre-sommaire" className="space-y-8">
          <H2 id="livre-sommaire" size="h3" className="text-2xl font-bold">
            {t('tocTitle')}
          </H2>
          {parts.map(part => (
            <Div key={part} className="space-y-3">
              <H3 size="h4" className="text-lg font-semibold text-muted-foreground">
                {part}
              </H3>
              <Div className="grid gap-3">
                {chapters
                  .filter(chapter => chapter.part === part)
                  .map(chapter => (
                    <Card key={chapter.slug} variant="floating" className="p-0">
                      <Link href={`/livre/${chapter.slug}`} className="block space-y-1 p-5">
                        <Span className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {chapter.chapter}
                        </Span>
                        <Span className="block text-lg font-semibold">{chapter.title}</Span>
                        <P className="text-sm text-muted-foreground">{chapter.description}</P>
                        <Span className="text-xs text-muted-foreground">
                          {t('readingTime', { minutes: chapter.readingMinutes })}
                        </Span>
                      </Link>
                    </Card>
                  ))}
              </Div>
            </Div>
          ))}
        </Section>
      </Section>
    </Main>
  )
}
