import { BOOK, getAllChapterSlugs, getChapterBySlug } from '@/lib/book'
import { getCanonicalUrl } from '@ezstart/config/urls'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return getAllChapterSlugs().map(slug => ({ slug }))
}

/**
 * Raw Markdown twin of a chapter, served at `/livre/<slug>.md` (rewrite in
 * `next.config.ts`). Markdown is the format LLM crawlers read best.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params
  const chapter = getChapterBySlug(slug)
  if (!chapter) return new Response('Not found', { status: 404 })

  const canonical = `${getCanonicalUrl('asc-tcd', 'web')}/fr/livre/${chapter.slug}`
  const header = [
    `# ${chapter.title}`,
    '',
    `> ${BOOK.title} — ${chapter.part} — ${chapter.chapter}. Par ${BOOK.author} (${BOOK.publisher}).`,
    `> Version web : ${canonical}`,
    '',
  ].join('\n')

  return new Response(`${header}\n${chapter.content}\n`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
