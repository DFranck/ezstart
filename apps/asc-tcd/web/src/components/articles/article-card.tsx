import type { ArticleMeta } from '@/lib/articles'
import { Link } from '@/i18n/navigation'
import { Badge, Card, CardContent, CardFooter, Div, H3, P, Span } from '@ezstart/ui/components'
import Image from 'next/image'

export interface ArticleCardProps {
  article: ArticleMeta
  /** Localized publication date (already formatted). */
  dateFormatted: string
  /** Localized reading-time label, e.g. "4 min de lecture". */
  readingLabel: string
  /** Localized call-to-action, e.g. "Lire l'article". */
  readMoreLabel: string
}

/**
 * Presentational card linking to a single article. Server Component — receives
 * already-localized strings so it stays free of i18n and data concerns.
 */
export function ArticleCard({
  article,
  dateFormatted,
  readingLabel,
  readMoreLabel,
}: ArticleCardProps) {
  return (
    <Card variant="floating" className="group overflow-hidden p-0 h-full flex flex-col">
      <Link href={`/articles/${article.slug}`} className="flex flex-col h-full">
        {article.cover && (
          <Div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={article.cover}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Div>
        )}
        <CardContent className="flex flex-col gap-3 p-6 flex-1">
          <Div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Span>{dateFormatted}</Span>
            <Span aria-hidden="true">·</Span>
            <Span>{readingLabel}</Span>
          </Div>
          <H3 size="h5" className="line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </H3>
          <P size="sm" className="text-muted-foreground line-clamp-3 flex-1">
            {article.description}
          </P>
          {article.tags.length > 0 && (
            <Div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <Badge key={tag} variant="outline" size="xs" className="text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </Div>
          )}
        </CardContent>
        <CardFooter className="px-6 pb-6 pt-0">
          <Span className="text-primary font-medium text-sm group-hover:underline">
            {readMoreLabel} →
          </Span>
        </CardFooter>
      </Link>
    </Card>
  )
}
