'use client'

import {
  Blockquote,
  Code,
  Div,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Hr,
  LI,
  Ol,
  P,
  Pre,
  Strong,
  UL,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Local markdown renderer for asc-tcd articles.
 *
 * asc-tcd is a Tier-2 consumer app and owns its article rendering so it stays
 * deployable independently of the `@ezstart/ui` version pinned in each
 * environment (the shared `MarkdownContent` export is newer than some prod
 * pins). Maps GitHub-Flavored Markdown onto `@ezstart/ui` typography.
 */
export interface ArticleMarkdownProps {
  content: string
  className?: string
}

const components: Components = {
  h1: ({ children }) => (
    <H1 size="h2" className="mt-8 mb-4 first:mt-0 scroll-mt-20">
      {children}
    </H1>
  ),
  h2: ({ children }) => (
    <H2 size="h3" className="mt-8 mb-4 pb-2 border-b border-border scroll-mt-20">
      {children}
    </H2>
  ),
  h3: ({ children }) => (
    <H3 size="h4" className="mt-6 mb-3 scroll-mt-20">
      {children}
    </H3>
  ),
  h4: ({ children }) => (
    <H4 size="h5" className="mt-6 mb-2 scroll-mt-20">
      {children}
    </H4>
  ),
  h5: ({ children }) => <H5 className="mt-4 mb-2 scroll-mt-20">{children}</H5>,
  h6: ({ children }) => <H6 className="mt-4 mb-2 scroll-mt-20">{children}</H6>,
  p: ({ children }) => <P className="my-4 text-foreground leading-relaxed">{children}</P>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <Strong className="font-semibold">{children}</Strong>,
  ul: ({ children }) => <UL className="my-4 ml-6 list-disc space-y-2">{children}</UL>,
  ol: ({ children }) => <Ol className="my-4 ml-6 list-decimal space-y-2">{children}</Ol>,
  li: ({ children }) => <LI className="text-foreground leading-relaxed">{children}</LI>,
  blockquote: ({ children }) => (
    <Blockquote className="my-4 pl-4 border-l-4 border-primary bg-muted/50 py-2 text-muted-foreground italic">
      {children}
    </Blockquote>
  ),
  hr: () => <Hr className="my-8 border-border" />,
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <Code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
        {children}
      </Code>
    ),
  pre: ({ children }) => (
    <Pre className="my-4 max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono border border-border">
      {children}
    </Pre>
  ),
  table: ({ children }) => (
    <Div className="my-4 w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </Div>
  ),
  thead: ({ children }) => <thead className="border-b border-border bg-muted/50">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-foreground align-top">{children}</td>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element -- markdown content image, next/image needs known dimensions
    <img
      src={typeof src === 'string' ? src : ''}
      alt={alt ?? ''}
      className="my-6 w-full rounded-lg border border-border"
    />
  ),
}

export function ArticleMarkdown({ content, className }: ArticleMarkdownProps) {
  return (
    <Div className={cn('min-w-0 max-w-none break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </Div>
  )
}
