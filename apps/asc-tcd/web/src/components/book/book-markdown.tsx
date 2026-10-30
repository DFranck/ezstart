'use client'

import { Div } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FOOTNOTE_LABELS, markdownComponents } from '../articles/article-markdown'
import { CarbonCurve } from './carbon-curve'
import { KeyFigures } from './key-figures'

/**
 * Markdown renderer for the book. Extends the article mapping with:
 * - `![alt](src "caption")` → `<figure>` with a visible `<figcaption>`
 * - fenced blocks `figures` / `carbon-curve` → HTML infographics (crawlable)
 * - internal links → same-tab, external links → new tab (handled upstream)
 */
/** Prefix root-relative page links with the locale so crawlers skip the redirect. */
function localizeHref(href: string | undefined, locale: string): string | undefined {
  if (!href?.startsWith('/') || href.startsWith(`/${locale}/`) || /\.\w+$/.test(href)) return href
  return `/${locale}${href}`
}

function createComponents(locale: string): Components {
  return {
    ...markdownComponents,
    a: ({ children, href }) => {
      const external = href?.startsWith('http')
      return (
        <a
          href={localizeHref(href, locale)}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      )
    },
    img: ({ src, alt, title }) => (
      <figure className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- markdown content image, dimensions unknown */}
        <img
          src={typeof src === 'string' ? src : ''}
          alt={alt ?? ''}
          loading="lazy"
          className="mx-auto h-auto max-w-full rounded-lg border border-border"
        />
        {title && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {title}
          </figcaption>
        )}
      </figure>
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ children, className }) => {
      const block = /language-([\w-]+)/.exec(className ?? '')?.[1]
      if (block === 'figures') return <KeyFigures source={String(children)} />
      if (block === 'carbon-curve') return <CarbonCurve />
      const Inline = markdownComponents.code
      return Inline ? <Inline className={className}>{children}</Inline> : <code>{children}</code>
    },
  }
}

export interface BookMarkdownProps {
  content: string
  /** Active locale, used to prefix internal links. */
  locale: string
  className?: string
}

export function BookMarkdown({ content, locale, className }: BookMarkdownProps) {
  return (
    <Div className={cn('min-w-0 max-w-none break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={FOOTNOTE_LABELS}
        components={createComponents(locale)}
      >
        {content}
      </ReactMarkdown>
    </Div>
  )
}
