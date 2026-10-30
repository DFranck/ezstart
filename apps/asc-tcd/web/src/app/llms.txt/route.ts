import { getAllArticles } from '@/lib/articles'
import { BOOK, getAllChapters } from '@/lib/book'
import { getCanonicalUrl } from '@ezstart/config/urls'

export const dynamic = 'force-static'

/**
 * `/llms.txt` — Markdown index of the site's long-form content for LLM crawlers
 * (llmstxt.org). Each chapter is linked to its raw `.md` twin.
 */
export function GET() {
  const origin = getCanonicalUrl('asc-tcd', 'web')
  const chapters = getAllChapters()
  const articles = getAllArticles()

  const lines = [
    "# ASC-TCD — Transplantation d'arbres",
    '',
    "> ASC-TCD déplace des arbres adultes plutôt que de les abattre (transplantation, Plan Local de l'Arbre, accompagnement des collectivités). Le site publie le livre gratuit « Transplantation d'arbres & ODD » d'Ambre Seradni et des articles de fond.",
    '',
    `## Livre : ${BOOK.title}`,
    '',
    `${BOOK.description} Auteure : ${BOOK.author}. Éditeur : ${BOOK.publisher}.`,
    '',
    `- [Sommaire du livre](${origin}/fr/livre): présentation et table des matières`,
    ...chapters.map(
      c => `- [${c.chapter} — ${c.title}](${origin}/livre/${c.slug}.md): ${c.description}`
    ),
    '',
    '## Articles',
    '',
    ...articles.map(a => `- [${a.title}](${origin}/fr/articles/${a.slug}): ${a.description}`),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
